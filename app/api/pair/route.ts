import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "../../lib/supabase";

/**
 * POST /api/pair
 *
 * Called by the Android app to confirm device pairing using a 6-digit code.
 *
 * Request body (JSON):
 *   { "pairing_code": "123456", "device_fingerprint": "<optional-string>" }
 *
 * Responses:
 *   200 { device: { id, device_name, child_id, home_id } }  — paired successfully
 *   400 { error: "..." }  — bad request (missing code)
 *   404 { error: "Invalid or expired pairing code" }        — code not found / expired
 *   409 { error: "Device already paired" }                  — already paired
 */
export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const pairingCode = typeof body.pairing_code === "string" ? body.pairing_code.trim() : null;
  const deviceFingerprint = typeof body.device_fingerprint === "string" ? body.device_fingerprint.trim() : null;

  if (!pairingCode) {
    return NextResponse.json({ error: "pairing_code is required" }, { status: 400 });
  }

  const supabase = createSupabaseServerClient();

  // Look up the device by pairing code
  const { data: device, error: lookupError } = await supabase
    .from("devices")
    .select("id, device_name, child_id, home_id, paired_at, pairing_expires_at, status")
    .eq("pairing_code", pairingCode)
    .single();

  if (lookupError || !device) {
    console.log("[/api/pair] code not found:", pairingCode);
    return NextResponse.json({ error: "Invalid or expired pairing code" }, { status: 404 });
  }

  // Already paired
  if (device.paired_at) {
    return NextResponse.json({ error: "Device already paired" }, { status: 409 });
  }

  // Code expired
  if (device.pairing_expires_at && new Date(device.pairing_expires_at) < new Date()) {
    console.log("[/api/pair] code expired for device:", device.id);
    return NextResponse.json({ error: "Invalid or expired pairing code" }, { status: 404 });
  }

  // Mark as paired
  const now = new Date().toISOString();
  const updatePayload: Record<string, string | null> = {
    paired_at: now,
    status: "active",
    pairing_code: null,         // clear the code so it can't be reused
    pairing_expires_at: null,
  };
  if (deviceFingerprint) {
    updatePayload.device_fingerprint = deviceFingerprint;
  }

  const { error: updateError } = await supabase
    .from("devices")
    .update(updatePayload)
    .eq("id", device.id);

  if (updateError) {
    console.error("[/api/pair] update failed:", updateError.message);
    return NextResponse.json({ error: "Failed to complete pairing" }, { status: 500 });
  }

  console.log("[/api/pair] paired device:", device.id);
  return NextResponse.json({
    device: {
      id: device.id,
      device_name: device.device_name,
      child_id: device.child_id,
      home_id: device.home_id,
    },
  });
}
