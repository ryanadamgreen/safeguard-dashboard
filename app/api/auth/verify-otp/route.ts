import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "../../../lib/supabase";

export async function POST(req: NextRequest) {
  const { staffId, code } = await req.json() as { staffId: string; code: string };

  if (!staffId || !code) {
    return NextResponse.json({ error: "Missing staffId or code" }, { status: 400 });
  }

  const supabase = createSupabaseServerClient();

  // Find a valid, unused, unexpired code
  const { data: otpRow } = await supabase
    .from("otp_codes")
    .select("id, expires_at")
    .eq("staff_id", staffId)
    .eq("code", code)
    .eq("used", false)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (!otpRow) {
    return NextResponse.json({ error: "Invalid or expired code" }, { status: 401 });
  }

  if (new Date(otpRow.expires_at) < new Date()) {
    return NextResponse.json({ error: "Code has expired. Please sign in again." }, { status: 401 });
  }

  // Mark as used
  await supabase
    .from("otp_codes")
    .update({ used: true })
    .eq("id", otpRow.id);

  return NextResponse.json({ ok: true });
}
