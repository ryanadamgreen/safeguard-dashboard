import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "../../../lib/supabase";
import { sendOtpEmail } from "../../../lib/email";

function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(req: NextRequest) {
  const { staffId, email } = await req.json() as { staffId: string; email: string };

  if (!staffId || !email) {
    return NextResponse.json({ error: "Missing staffId or email" }, { status: 400 });
  }

  const supabase = createSupabaseServerClient();

  // Fetch staff name for the email
  const { data: staff } = await supabase
    .from("staff")
    .select("full_name")
    .eq("id", staffId)
    .single();

  const name = staff?.full_name ?? "there";

  // Invalidate any existing unused codes for this staff member
  await supabase
    .from("otp_codes")
    .update({ used: true })
    .eq("staff_id", staffId)
    .eq("used", false);

  // Generate new code
  const code = generateCode();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes

  const { error: insertError } = await supabase
    .from("otp_codes")
    .insert({ staff_id: staffId, code, expires_at: expiresAt });

  if (insertError) {
    console.error("[send-otp] insert error:", insertError.message);
    return NextResponse.json({ error: "Failed to generate code" }, { status: 500 });
  }

  try {
    await sendOtpEmail(email, code, name);
  } catch (err) {
    console.error("[send-otp] email error:", err);
    return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
