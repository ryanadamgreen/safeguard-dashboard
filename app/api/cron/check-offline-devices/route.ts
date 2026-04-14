import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "../../../lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  // ── Auth ────────────────────────────────────────────────────────────────────
  const authHeader = request.headers.get("authorization");
  const expectedToken = process.env.CRON_SECRET;

  if (!expectedToken || authHeader !== `Bearer ${expectedToken}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createSupabaseServerClient();

  // ── Find stale devices ──────────────────────────────────────────────────────
  // Devices that are not already marked offline and haven't sent a heartbeat
  // in the last 5 minutes.
  const cutoff = new Date(Date.now() - 5 * 60 * 1000).toISOString();

  const { data: staleDevices, error: devicesError } = await supabase
    .from("devices")
    .select("id, home_id, child_id, device_name")
    .neq("status", "offline")
    .not("last_seen", "is", null)
    .lt("last_seen", cutoff);

  if (devicesError) {
    console.error("[check-offline-devices] query error:", devicesError.message);
    return NextResponse.json({ error: devicesError.message }, { status: 500 });
  }

  if (!staleDevices || staleDevices.length === 0) {
    return NextResponse.json({ markedOffline: 0, skipped: 0 });
  }

  const staleIds = staleDevices.map((d) => d.id);

  // ── Rate-limit: skip devices that already have an unresolved offline alert ──
  const { data: existingAlerts, error: alertsError } = await supabase
    .from("alerts")
    .select("device_id")
    .in("device_id", staleIds)
    .eq("category", "device_offline")
    .eq("resolved", false);

  if (alertsError) {
    console.error("[check-offline-devices] existing alerts query error:", alertsError.message);
    return NextResponse.json({ error: alertsError.message }, { status: 500 });
  }

  const alreadyAlerted = new Set((existingAlerts ?? []).map((a) => a.device_id));
  const toProcess = staleDevices.filter((d) => !alreadyAlerted.has(d.id));
  const skipped = staleDevices.length - toProcess.length;

  if (toProcess.length === 0) {
    return NextResponse.json({ markedOffline: 0, skipped });
  }

  // ── Insert offline alerts ───────────────────────────────────────────────────
  const alertRows = toProcess.map((d) => ({
    device_id: d.id,
    child_id: d.child_id,
    home_id: d.home_id,
    category: "device_offline",
    alert_type: "device_offline",
    severity: "high",
    description: `${d.device_name ?? "Device"} has not sent a heartbeat for over 5 minutes. Screen monitoring and remote controls are suspended until the device reconnects.`,
    resolved: false,
  }));

  const { error: insertError } = await supabase.from("alerts").insert(alertRows);

  if (insertError) {
    console.error("[check-offline-devices] alert insert error:", insertError.message);
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  // ── Mark devices offline ────────────────────────────────────────────────────
  const { error: updateError } = await supabase
    .from("devices")
    .update({ status: "offline" })
    .in("id", toProcess.map((d) => d.id));

  if (updateError) {
    console.error("[check-offline-devices] device update error:", updateError.message);
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  console.log(`[check-offline-devices] marked ${toProcess.length} device(s) offline, skipped ${skipped}`);
  return NextResponse.json({ markedOffline: toProcess.length, skipped });
}
