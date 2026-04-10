import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "../../../lib/supabase";
import { buildReportHtml } from "../../../lib/generateReport";

export async function POST(req: NextRequest) {
  const { reportId } = await req.json() as { reportId: string };
  if (!reportId) return NextResponse.json({ error: "Missing reportId" }, { status: 400 });

  const supabase = createSupabaseServerClient();

  // 1. Fetch the report row
  const { data: report } = await supabase
    .from("reports")
    .select("*, homes(name, address), staff(full_name)")
    .eq("id", reportId)
    .single();

  if (!report) return NextResponse.json({ error: "Report not found" }, { status: 404 });

  // 2. Fetch alerts for this home within the date range
  let alertQuery = supabase
    .from("alerts")
    .select("*, children(id, initials, age)")
    .eq("home_id", report.home_id)
    .gte("created_at", report.date_range_start)
    .lte("created_at", report.date_range_end + "T23:59:59Z")
    .order("created_at", { ascending: false });

  if (report.children_included && report.children_included.length > 0) {
    alertQuery = alertQuery.in("child_id", report.children_included);
  }

  const { data: alerts } = await alertQuery;

  // 3. Fetch children for this home
  let childQuery = supabase
    .from("children")
    .select("*, devices(device_name)")
    .eq("home_id", report.home_id);

  if (report.children_included && report.children_included.length > 0) {
    childQuery = childQuery.in("id", report.children_included);
  }

  const { data: children } = await childQuery;

  // 4. Map to ReportConfig shape
  // Normalise DB type (underscores) to switch-case IDs (hyphens)
  const reportTypeId = (report.type as string).replace(/_/g, "-");

  const config = {
    reportTypeId,
    reportTypeName: typeLabel(report.type),
    homeName:       report.homes?.name ?? "Unknown Home",
    homeAddress:    report.homes?.address ?? "",
    staffName:      report.staff?.full_name ?? "Staff",
    dateFrom:       formatDateUK(report.date_range_start),
    dateTo:         formatDateUK(report.date_range_end),
    selectedChild:  "all",
    includeTamper:  true,
    notes:          "",
    alerts: (alerts ?? []).map((a) => ({
      id:            a.id,
      timestamp:     a.created_at,
      childInitials: a.children?.initials ?? "—",
      childName:     a.children?.initials ?? "—",
      alertType:     friendlyType(a.alert_type ?? ""),
      severity:      a.severity ?? "low",
      description:   a.description ?? "",
      homeId:        a.home_id,
    })),
    tamperEvents: (alerts ?? [])
      .filter((a) => a.alert_type === "tamper")
      .map((a) => ({
        id:            a.id,
        timestamp:     a.created_at,
        childInitials: a.children?.initials ?? "—",
        childName:     a.children?.initials ?? "—",
        device:        a.devices?.device_name ?? "Unknown Device",
        eventType:     a.description ?? "Tamper detected",
        location:      { area: formatLocation(a.last_location) },
      })),
    children: (children ?? []).map((c) => ({
      id:        c.id,
      name:      c.initials,
      initials:  c.initials,
      age:       c.age ?? 0,
      room:      "—",
      keyWorker: c.key_worker ?? "—",
      deviceId:  c.devices?.[0]?.device_name ?? null,
    })),
  };

  // 5. Build HTML
  const html = buildReportHtml(config);

  // 6. Upload to Supabase Storage
  const fileName = `${report.home_id}/${reportId}.html`;
  const { error: uploadError } = await supabase.storage
    .from("reports")
    .upload(fileName, Buffer.from(html, "utf-8"), {
      contentType: "text/html",
      upsert: true,
    });

  if (uploadError) {
    console.error("[generate-report] upload error:", uploadError.message);
    return NextResponse.json({ error: "Failed to save report" }, { status: 500 });
  }

  // 7. Create signed URL (valid 7 days)
  const { data: signed } = await supabase.storage
    .from("reports")
    .createSignedUrl(fileName, 60 * 60 * 24 * 7);

  if (!signed?.signedUrl) {
    return NextResponse.json({ error: "Failed to create download link" }, { status: 500 });
  }

  // 8. Update report row
  await supabase
    .from("reports")
    .update({ status: "complete", file_url: signed.signedUrl })
    .eq("id", reportId);

  return NextResponse.json({ fileUrl: signed.signedUrl });
}

function typeLabel(type: string) {
  const map: Record<string, string> = {
    safeguarding_summary: "Safeguarding Summary",
    critical_incident:    "Critical Incident",
    monthly_overview:     "Monthly Overview",
  };
  return map[type] ?? type;
}

function friendlyType(raw: string) {
  return raw.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatDateUK(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function formatLocation(loc: Record<string, unknown> | null | undefined) {
  if (!loc) return "Unknown";
  const { lat, lng } = loc as { lat?: number; lng?: number };
  if (typeof lat === "number" && typeof lng === "number") return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  return "Unknown";
}
