import { NextRequest, NextResponse } from "next/server";
import { sendTamperEmail } from "../../../lib/email";
import { getStaff, getHomes } from "../../../lib/supabase/queries";
import type { TamperEvent } from "../../../lib/types";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { event: TamperEvent; homeName?: string };
    const { event } = body;

    if (!event || !event.homeId) {
      return NextResponse.json({ error: "Invalid tamper event payload" }, { status: 400 });
    }

    // homeId in the payload is the UUID string from the DB
    const homeIdStr = String(event.homeId);

    const [dbStaff, dbHomes] = await Promise.all([getStaff(), getHomes()]);

    const home = dbHomes.find((h) => h.id === homeIdStr);
    const homeName = body.homeName ?? home?.name ?? "Residential Home";

    // Tamper alerts always go to all staff for the home — no preference check
    const recipients = dbStaff
      .filter((s) => s.staff_homes.some((sh) => sh.home_id === homeIdStr))
      .map((s) => s.email);

    if (recipients.length === 0) {
      return NextResponse.json({ skipped: true, reason: "No recipients for this home" });
    }

    await sendTamperEmail(recipients, event, homeName);

    return NextResponse.json({ success: true, sentTo: recipients.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[send-tamper]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
