import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createSupabaseServerClient } from "../../lib/supabase";

/**
 * POST /api/repairDevice
 *
 * Resets an existing device for re-pairing: generates a fresh 6-digit code,
 * clears paired_at and last_seen, sets status back to 'pending'.
 *
 * Requires an authenticated dashboard session (cookie-based).
 *
 * Request body (JSON):
 *   { "deviceId": "<uuid>" }
 *
 * Responses:
 *   200 { pairingCode: "123456" }
 *   400 { error: "..." }   — missing/invalid body
 *   401 { error: "..." }   — not authenticated
 *   500 { error: "..." }   — DB error
 */
export async function POST(request: Request) {
  // ── Auth check ──────────────────────────────────────────────────────────────
  const cookieStore = await cookies();
  const anonClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll(); }, setAll() {} } }
  );
  const { data: { user } } = await anonClient.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ── Parse body ──────────────────────────────────────────────────────────────
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const deviceId = typeof body.deviceId === "string" ? body.deviceId.trim() : null;
  if (!deviceId) {
    return NextResponse.json({ error: "deviceId is required" }, { status: 400 });
  }

  // ── Generate new pairing code ────────────────────────────────────────────────
  const pairingCode = Math.floor(100000 + Math.random() * 900000).toString();
  const pairingExpiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  // ── Reset device in Supabase ─────────────────────────────────────────────────
  const supabase = createSupabaseServerClient();
  const { error } = await supabase
    .from("devices")
    .update({
      pairing_code: pairingCode,
      pairing_expires_at: pairingExpiresAt,
      status: "pending",
      paired_at: null,
      last_seen: null,
    })
    .eq("id", deviceId);

  if (error) {
    console.error("[/api/repairDevice] update failed:", error.message);
    return NextResponse.json({ error: "Failed to reset device" }, { status: 500 });
  }

  console.log("[/api/repairDevice] device reset for re-pairing:", deviceId);
  return NextResponse.json({ pairingCode });
}
