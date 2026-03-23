"use server";

/**
 * Server actions for Supabase mutations.
 * Safe to import from Client Components — Next.js serialises the call
 * and executes it on the server.
 */

import { randomInt } from "node:crypto";
import { createSupabaseServerClient } from "../supabase";

/**
 * Mark an alert as resolved.
 * Requires the `resolved` (boolean) and `resolved_at` (timestamptz)
 * columns to exist on the alerts table.
 */
export async function markAlertResolved(
  alertId: string
): Promise<{ error: string | null }> {
  const supabase = createSupabaseServerClient();
  const { error } = await supabase
    .from("alerts")
    .update({ resolved: true, resolved_at: new Date().toISOString() })
    .eq("id", alertId);

  if (error) {
    console.error("[markAlertResolved]", error.message);
    return { error: error.message };
  }
  return { error: null };
}

/**
 * Send a command to a device.
 * Inserts a row into the device_commands table.
 * Supported command types: 'lock', 'unlock', 'sync'
 */
export async function sendDeviceCommand(
  deviceId: string,
  commandType: "lock" | "unlock" | "sync",
  payload?: Record<string, unknown>
): Promise<{ error: string | null }> {
  const supabase = createSupabaseServerClient();
  const { error } = await supabase.from("device_commands").insert({
    device_id: deviceId,
    command_type: commandType,
    payload: payload ?? null,
    created_at: new Date().toISOString(),
  });

  if (error) {
    console.error("[sendDeviceCommand]", error.message);
    return { error: error.message };
  }
  return { error: null };
}

// ─── Home actions ─────────────────────────────────────────────────────────────

export async function createHome(data: {
  name: string;
  organisation_id: string;
  sc_urn?: string;
  address?: string;
  phone?: string;
  email?: string;
  responsible_individual?: string;
}): Promise<{ id: string | null; error: string | null }> {
  const supabase = createSupabaseServerClient();
  const { data: row, error } = await supabase
    .from("homes")
    .insert({ ...data, status: "active" })
    .select("id")
    .single();
  if (error) {
    console.error("[createHome]", error.message);
    return { id: null, error: error.message };
  }
  return { id: row.id, error: null };
}

export async function updateHome(
  id: string,
  data: Partial<{
    name: string;
    organisation_id: string;
    sc_urn: string;
    address: string;
    phone: string;
    email: string;
    responsible_individual: string;
    status: string;
  }>
): Promise<{ error: string | null }> {
  const supabase = createSupabaseServerClient();
  const { error } = await supabase.from("homes").update(data).eq("id", id);
  if (error) {
    console.error("[updateHome]", error.message);
    return { error: error.message };
  }
  return { error: null };
}

export async function deleteHome(id: string): Promise<{ error: string | null }> {
  const supabase = createSupabaseServerClient();
  const { error } = await supabase.from("homes").delete().eq("id", id);
  if (error) {
    console.error("[deleteHome]", error.message);
    return { error: error.message };
  }
  return { error: null };
}

// ─── Staff actions ────────────────────────────────────────────────────────────

export async function inviteStaff(data: {
  full_name: string;
  email: string;
  role: string;
  job_title?: string;
  organisation_id?: string;
  home_ids: string[];
}): Promise<{ id: string | null; error: string | null }> {
  // Top-level try-catch so the action always returns {id, error} and never
  // throws — an unhandled throw becomes Next.js's opaque "unexpected response"
  // message on the client, hiding the real cause.
  try {
    const supabase = createSupabaseServerClient();

    // Step 1: create the auth user — their UUID becomes the staff.id
    const { data: inviteData, error: inviteError } = await supabase.auth.admin.inviteUserByEmail(
      data.email,
      {
        data: { full_name: data.full_name, role: data.role },
        redirectTo: "https://safeguard-dashboard-five.vercel.app/set-password",
      }
    );
    if (inviteError) {
      console.error("[inviteStaff] auth.admin.inviteUserByEmail failed:", {
        message: inviteError.message,
        status: inviteError.status,
      });
      return { id: null, error: inviteError.message };
    }
    const authUserId = inviteData.user.id;
    console.log("[inviteStaff] auth user created:", authUserId);

    // Step 2: insert staff row using the auth UUID so staff.id = auth.uid()
    const { data: staffRow, error: staffError } = await supabase
      .from("staff")
      .insert({
        id: authUserId,
        full_name: data.full_name,
        email: data.email,
        role: data.role,
        job_title: data.job_title ?? null,
        organisation_id: data.organisation_id ?? null,
      })
      .select("id")
      .single();

    if (staffError) {
      console.error("[inviteStaff] staff insert failed:", {
        message: staffError.message,
        code: staffError.code,
        details: staffError.details,
        hint: staffError.hint,
      });
      await supabase.auth.admin.deleteUser(authUserId);
      return { id: null, error: `Staff insert failed: ${staffError.message}` };
    }
    console.log("[inviteStaff] staff row created:", staffRow.id);

    // Step 3: insert staff_homes rows
    if (data.home_ids.length > 0) {
      const { error: homesError } = await supabase.from("staff_homes").insert(
        data.home_ids.map((home_id) => ({ staff_id: staffRow.id, home_id }))
      );
      if (homesError) {
        console.error("[inviteStaff] staff_homes insert failed:", {
          message: homesError.message,
          code: homesError.code,
          details: homesError.details,
          hint: homesError.hint,
        });
        await supabase.from("staff").delete().eq("id", staffRow.id);
        await supabase.auth.admin.deleteUser(authUserId);
        return { id: null, error: `Home assignment failed: ${homesError.message}` };
      }
    }

    return { id: staffRow.id, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[inviteStaff] unexpected exception:", message);
    return { id: null, error: `Unexpected error: ${message}` };
  }
}

export async function updateStaff(
  id: string,
  data: Partial<{
    full_name: string;
    email: string;
    role: string;
    job_title: string;
  }>,
  home_ids?: string[]
): Promise<{ error: string | null }> {
  const supabase = createSupabaseServerClient();

  const { error } = await supabase.from("staff").update(data).eq("id", id);
  if (error) {
    console.error("[updateStaff]", error.message);
    return { error: error.message };
  }

  if (home_ids !== undefined) {
    await supabase.from("staff_homes").delete().eq("staff_id", id);
    if (home_ids.length > 0) {
      const { error: homesError } = await supabase.from("staff_homes").insert(
        home_ids.map((home_id) => ({ staff_id: id, home_id }))
      );
      if (homesError) {
        console.error("[updateStaff] staff_homes", homesError.message);
        return { error: homesError.message };
      }
    }
  }

  return { error: null };
}

export async function removeStaff(id: string): Promise<{ error: string | null }> {
  const supabase = createSupabaseServerClient();
  const { error } = await supabase.from("staff").delete().eq("id", id);
  if (error) {
    console.error("[removeStaff]", error.message);
    return { error: error.message };
  }
  return { error: null };
}

// ─── Device pairing actions ───────────────────────────────────────────────────

/**
 * Insert a new device row with a cryptographically random pairing code.
 * Returns the device id, the plain-text pairing code, and its expiry ISO string.
 */
export async function createDevice(
  childId: string,
  homeId: string,
  details: {
    device_name: string;
    device_type: string;
    manufacturer: string;
    model: string | null;
    ownership: string;
  }
): Promise<{ id: string | null; pairingCode: string; pairingExpiresAt: string; error: string | null }> {
  const supabase = createSupabaseServerClient();

  const pairingCode = randomInt(100000, 1000000).toString();
  const pairingExpiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  const { data: row, error } = await supabase
    .from("devices")
    .insert({
      child_id: childId,
      home_id: homeId,
      device_name: details.device_name,
      device_type: details.device_type,
      manufacturer: details.manufacturer,
      model: details.model,
      ownership: details.ownership,
      pairing_code: pairingCode,
      pairing_expires_at: pairingExpiresAt,
      status: "pending",
      created_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error) {
    console.error("[createDevice]", error.message);
    return { id: null, pairingCode: "", pairingExpiresAt: "", error: error.message };
  }

  return { id: row.id, pairingCode, pairingExpiresAt, error: null };
}

/**
 * Poll for pairing completion.
 * Returns pairedAt (non-null when device has confirmed pairing)
 * and isExpired (true if expiry has passed and device never paired).
 */
export async function checkPairingStatus(
  deviceId: string
): Promise<{ pairedAt: string | null; isExpired: boolean; error: string | null }> {
  const supabase = createSupabaseServerClient();
  const { data: row, error } = await supabase
    .from("devices")
    .select("paired_at, pairing_expires_at")
    .eq("id", deviceId)
    .single();

  if (error) {
    console.error("[checkPairingStatus]", error.message);
    return { pairedAt: null, isExpired: false, error: error.message };
  }

  const isExpired =
    !row.paired_at &&
    row.pairing_expires_at != null &&
    new Date(row.pairing_expires_at) < new Date();

  return { pairedAt: row.paired_at ?? null, isExpired, error: null };
}

/**
 * Mark a device as expired if it was never paired.
 * Called client-side when the countdown reaches zero.
 */
export async function expirePairingCode(
  deviceId: string
): Promise<{ error: string | null }> {
  const supabase = createSupabaseServerClient();
  const { error } = await supabase
    .from("devices")
    .update({ status: "expired" })
    .eq("id", deviceId)
    .is("paired_at", null);

  if (error) {
    console.error("[expirePairingCode]", error.message);
    return { error: error.message };
  }
  return { error: null };
}
