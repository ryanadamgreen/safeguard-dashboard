"use server";

/**
 * Server actions for Supabase mutations.
 * Safe to import from Client Components — Next.js serialises the call
 * and executes it on the server.
 */

import { randomInt } from "node:crypto";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createSupabaseServerClient } from "../supabase";

async function getCallerUserId(): Promise<string | null> {
  const cookieStore = await cookies();
  const client = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll(); }, setAll() {} } }
  );
  const { data: { user } } = await client.auth.getUser();
  return user?.id ?? null;
}

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
 * Poll for pairing completion by device ID.
 * Checks the specific device row and returns isPaired when paired_at is set.
 */
export async function checkPairingStatus(
  homeId: string,
  originalDeviceId: string
): Promise<{ isPaired: boolean; pairedDeviceId: string | null; isExpired: boolean; error: string | null }> {
  const supabase = createSupabaseServerClient();

  console.log("[checkPairingStatus] querying deviceId:", originalDeviceId);

  const { data: row, error } = await supabase
    .from("devices")
    .select("id, paired_at, pairing_expires_at")
    .eq("id", originalDeviceId)
    .single();

  console.log("[checkPairingStatus] result:", JSON.stringify(row), "error:", error?.message ?? null);

  if (error) {
    console.error("[checkPairingStatus] query error:", error.message);
    return { isPaired: false, pairedDeviceId: null, isExpired: false, error: error.message };
  }

  if (row.paired_at !== null) {
    console.log("[checkPairingStatus] PAIRED detected, device id:", row.id);
    return { isPaired: true, pairedDeviceId: row.id, isExpired: false, error: null };
  }

  const isExpired =
    row.pairing_expires_at != null &&
    new Date(row.pairing_expires_at) < new Date();

  return { isPaired: false, pairedDeviceId: null, isExpired, error: null };
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

/**
 * Permanently delete a device record (unpair).
 */
export async function deleteDevice(
  deviceId: string
): Promise<{ error: string | null }> {
  const supabase = createSupabaseServerClient();
  const { error } = await supabase.from("devices").delete().eq("id", deviceId);
  if (error) {
    console.error("[deleteDevice]", error.message);
    return { error: error.message };
  }
  return { error: null };
}

// ─── Child actions ────────────────────────────────────────────────────────────

export async function createChild(data: {
  initials: string;
  age: number;
  key_worker: string;
  notes: string | null;
  home_id: string;
}): Promise<{ id: string | null; error: string | null }> {
  try {
    const supabase = createSupabaseServerClient();
    const { data: row, error } = await supabase
      .from("children")
      .insert({
        initials:   data.initials.trim().toUpperCase(),
        age:        data.age,
        key_worker: data.key_worker,
        notes:      data.notes || null,
        home_id:    data.home_id,
      })
      .select("id")
      .single();

    if (error) {
      console.error("[createChild]", error.message);
      return { id: null, error: error.message };
    }
    return { id: row.id, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[createChild] unexpected:", message);
    return { id: null, error: `Unexpected error: ${message}` };
  }
}

// ─── Report actions ───────────────────────────────────────────────────────────

const REPORT_TYPE_LABELS: Record<string, string> = {
  safeguarding_summary: "Safeguarding Summary",
  critical_incident:    "Critical Incident",
  monthly_overview:     "Monthly Overview",
};

export async function createReport(data: {
  type: string;
  date_range_start: string;
  date_range_end: string;
  home_id: string;
  children_included: string[] | null;
}): Promise<{ id: string | null; error: string | null }> {
  try {
    const userId = await getCallerUserId();
    if (!userId) return { id: null, error: "Not authenticated" };

    const start = new Date(data.date_range_start).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
    const end   = new Date(data.date_range_end).toLocaleDateString("en-GB",   { day: "numeric", month: "short", year: "numeric" });
    const title = `${REPORT_TYPE_LABELS[data.type] ?? data.type} — ${start} to ${end}`;

    const supabase = createSupabaseServerClient();
    const { data: row, error } = await supabase
      .from("reports")
      .insert({
        title,
        type:              data.type,
        date_range_start:  data.date_range_start,
        date_range_end:    data.date_range_end,
        home_id:           data.home_id,
        generated_by:      userId,
        children_included: data.children_included,
        status:            "pending",
      })
      .select("id, title, type, status, generated_at, date_range_start, date_range_end, home_id, generated_by, children_included, file_url, created_at")
      .single();

    if (error) {
      console.error("[createReport]", error.message);
      return { id: null, error: error.message };
    }
    return { id: row.id, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[createReport] unexpected:", message);
    return { id: null, error: `Unexpected error: ${message}` };
  }
}

export async function createReportSchedule(data: {
  home_id: string;
  type: string;
  frequency: "weekly" | "monthly";
  recipients: string[];
}): Promise<{ id: string | null; error: string | null }> {
  try {
    const userId = await getCallerUserId();
    if (!userId) return { id: null, error: "Not authenticated" };

    const now = new Date();
    let next_run_at: Date;
    if (data.frequency === "weekly") {
      const daysUntilMonday = ((8 - now.getDay()) % 7) || 7;
      next_run_at = new Date(now);
      next_run_at.setDate(now.getDate() + daysUntilMonday);
      next_run_at.setHours(6, 0, 0, 0);
    } else {
      next_run_at = new Date(now.getFullYear(), now.getMonth() + 1, 1, 6, 0, 0);
    }

    const supabase = createSupabaseServerClient();
    const { data: row, error } = await supabase
      .from("report_schedules")
      .insert({
        home_id:     data.home_id,
        type:        data.type,
        frequency:   data.frequency,
        recipients:  data.recipients,
        created_by:  userId,
        next_run_at: next_run_at.toISOString(),
      })
      .select("id")
      .single();

    if (error) {
      console.error("[createReportSchedule]", error.message);
      return { id: null, error: error.message };
    }
    return { id: row.id, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[createReportSchedule] unexpected:", message);
    return { id: null, error: `Unexpected error: ${message}` };
  }
}

export async function deleteReportSchedule(id: string): Promise<{ error: string | null }> {
  const supabase = createSupabaseServerClient();
  const { error } = await supabase.from("report_schedules").delete().eq("id", id);
  if (error) {
    console.error("[deleteReportSchedule]", error.message);
    return { error: error.message };
  }
  return { error: null };
}
