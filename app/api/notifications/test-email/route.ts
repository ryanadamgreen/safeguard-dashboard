import { NextRequest, NextResponse } from "next/server";
import { sendTestEmail } from "../../../lib/email";

export async function POST(req: NextRequest) {
  try {
    // Always send to the verified Resend account email in development
    const body = await req.json() as { email?: string };
    const _recipientHint = body.email; // kept for logging only
    const to = "rgmediaukltd@gmail.com";

    console.log("[test-email] Sending test email to:", to, "(requested for:", _recipientHint, ")");
    console.log("[test-email] RESEND_API_KEY set:", !!process.env.RESEND_API_KEY);

    const result = await sendTestEmail(to);
    console.log("[test-email] Success:", result);

    return NextResponse.json({ success: true, sentTo: to });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[test-email] Full error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
