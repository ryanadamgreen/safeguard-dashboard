import { NextRequest, NextResponse } from "next/server";
import { sendAlertEmail } from "../../../lib/email";
import { getStaff, getHomes } from "../../../lib/supabase/queries";
import type { Alert } from "../../../lib/types";

// Severities whose default channel includes email (mirrors INITIAL_PREFS in settings page)
const EMAIL_SEVERITIES = new Set<string>(["critical", "high"]);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { alert: Alert; homeName?: string };
    const { alert } = body;

    if (!alert || !alert.homeId || !alert.severity) {
      return NextResponse.json({ error: "Invalid alert payload" }, { status: 400 });
    }

    // homeId in the payload is the UUID string from the DB
    const homeIdStr = String(alert.homeId);

    const [dbStaff, dbHomes] = await Promise.all([getStaff(), getHomes()]);

    const home = dbHomes.find((h) => h.id === homeIdStr);
    const homeName = body.homeName ?? home?.name ?? "Residential Home";

    // Only email for severities that have email channel enabled by default
    if (!EMAIL_SEVERITIES.has(alert.severity)) {
      return NextResponse.json({ skipped: true, reason: "Severity not configured for email" });
    }

    // Find staff assigned to this home
    const recipients = dbStaff
      .filter((s) => s.staff_homes.some((sh) => sh.home_id === homeIdStr))
      .map((s) => s.email);

    if (recipients.length === 0) {
      return NextResponse.json({ skipped: true, reason: "No recipients for this home" });
    }

    await sendAlertEmail(recipients, alert, homeName);

    return NextResponse.json({ success: true, sentTo: recipients.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[send-alert]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
