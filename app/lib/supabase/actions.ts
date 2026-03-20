"use server";

/**
 * Server actions for Supabase mutations.
 * Safe to import from Client Components — Next.js serialises the call
 * and executes it on the server.
 */

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
  const supabase = createSupabaseServerClient();

  // Insert staff row
  const { data: staffRow, error: staffError } = await supabase
    .from("staff")
    .insert({
      full_name: data.full_name,
      email: data.email,
      role: data.role,
      job_title: data.job_title ?? null,
      organisation_id: data.organisation_id ?? null,
    })
    .select("id")
    .single();

  if (staffError) {
    console.error("[inviteStaff] staff insert", staffError.message);
    return { id: null, error: staffError.message };
  }

  // Insert staff_homes rows
  if (data.home_ids.length > 0) {
    const { error: homesError } = await supabase.from("staff_homes").insert(
      data.home_ids.map((home_id) => ({ staff_id: staffRow.id, home_id }))
    );
    if (homesError) {
      console.error("[inviteStaff] staff_homes insert", homesError.message);
      return { id: staffRow.id, error: homesError.message };
    }
  }

  // Send Supabase auth invite
  const { error: inviteError } = await supabase.auth.admin.inviteUserByEmail(data.email, {
    data: { full_name: data.full_name, role: data.role },
  });
  if (inviteError) {
    console.error("[inviteStaff] auth invite", inviteError.message);
    // Non-fatal — staff row created, invite email failed
  }

  return { id: staffRow.id, error: null };
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
