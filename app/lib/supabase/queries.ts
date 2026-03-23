/**
 * Single source of truth for all Supabase data queries.
 *
 * Uses the service-role server client (bypasses RLS) so these functions
 * are safe to call from any Next.js Server Component or Route Handler.
 * Do NOT import this file into client components — use server actions or
 * API routes to expose the data instead.
 */

import { createSupabaseServerClient } from "../supabase";

// ─── Inline DB types ──────────────────────────────────────────────────────────
// Derived from the Supabase schema. Replace with generated types once
// `supabase gen types typescript` is wired into the build.

export interface DbOrganisation {
  id: string;
  name: string;
  primary_contact_name: string | null;
  primary_contact_email: string | null;
  phone: string | null;
  address: string | null;
  subscription_status: string | null;
  trial_expires_at: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  created_at: string;
}

export interface DbHome {
  id: string;
  organisation_id: string;
  name: string;
  sc_urn: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  responsible_individual: string | null;
  status: string | null;
  created_at: string;
}

export interface DbStaffHome {
  home_id: string;
}

export interface DbStaff {
  id: string;
  full_name: string;
  email: string;
  job_title: string | null;
  role: string;
  organisation_id: string | null;
  created_at: string;
  staff_homes: DbStaffHome[];
}

export interface DbDevice {
  id: string;
  child_id: string | null;
  home_id: string;
  device_fingerprint: string | null;
  device_name: string | null;
  device_type: string | null;
  manufacturer: string | null;
  model: string | null;
  ownership: string | null;
  status: string | null;
  last_seen: string | null;
  last_location: Record<string, unknown> | null;
  battery_level: number | null;
  app_version: string | null;
  pairing_code: string | null;
  pairing_expires_at: string | null;
  paired_at: string | null;
  created_at: string;
}

export interface DbChildDevice extends DbDevice {
  // When fetched as a nested relation from children
}

export interface DbChild {
  id: string;
  home_id: string;
  initials: string;
  age: number | null;
  key_worker: string | null;
  notes: string | null;
  created_at: string;
  devices: DbDevice[];
}

export interface DbDeviceWithChild extends DbDevice {
  children: {
    id: string;
    initials: string;
    age: number | null;
  } | null;
}

export interface DbAlert {
  id: string;
  device_id: string | null;
  child_id: string | null;
  home_id: string;
  category: string | null;
  alert_type: string | null;
  severity: string | null;
  description: string | null;
  app_name: string | null;
  context: Record<string, unknown> | null;
  has_screenshot: boolean | null;
  screenshot_url: string | null;
  last_location: Record<string, unknown> | null;
  created_at: string;
  children: {
    id: string;
    initials: string;
    age: number | null;
  } | null;
  devices: {
    id: string;
    device_name: string | null;
    device_type: string | null;
  } | null;
}

export interface DbReport {
  id: string;
  title: string;
  type: string;
  generated_at: string;
  date_range_start: string | null;
  date_range_end: string | null;
  home_id: string;
  generated_by: string | null;
  file_url: string | null;
  created_at: string;
  homes: { name: string } | null;
  staff: { full_name: string } | null;
}

// ─── Query functions ──────────────────────────────────────────────────────────

/**
 * All organisations ordered by name.
 */
export async function getOrganisations(): Promise<DbOrganisation[]> {
  console.log("[getOrganisations] service role key present:", !!process.env.SUPABASE_SERVICE_ROLE_KEY);
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("organisations")
    .select("*")
    .order("name");

  console.log("[getOrganisations] rows:", data?.length ?? 0, "error:", error?.message ?? null);
  if (error) {
    return [];
  }
  return data as DbOrganisation[];
}

/**
 * All homes, optionally filtered by organisation.
 */
export async function getHomes(orgId?: string): Promise<DbHome[]> {
  const supabase = createSupabaseServerClient();
  let query = supabase.from("homes").select("*").order("name");
  if (orgId) query = query.eq("organisation_id", orgId);

  const { data, error } = await query;
  if (error) {
    console.error("[getHomes]", error.message);
    return [];
  }
  return data as DbHome[];
}

/**
 * All staff with their home assignments, optionally filtered by organisation.
 */
export async function getStaff(orgId?: string): Promise<DbStaff[]> {
  const supabase = createSupabaseServerClient();
  let query = supabase
    .from("staff")
    .select("*, staff_homes(home_id)")
    .order("full_name");
  if (orgId) query = query.eq("organisation_id", orgId);

  const { data, error } = await query;
  if (error) {
    console.error("[getStaff]", error.message);
    return [];
  }
  return data as DbStaff[];
}

/**
 * All children with their devices, optionally filtered by home.
 */
export async function getChildren(homeId?: string): Promise<DbChild[]> {
  const supabase = createSupabaseServerClient();
  let query = supabase
    .from("children")
    .select("*, devices(*)")
    .order("initials");
  if (homeId) query = query.eq("home_id", homeId);

  const { data, error } = await query;
  if (error) {
    console.error("[getChildren]", error.message);
    return [];
  }
  return data as DbChild[];
}

/**
 * All devices with their assigned child, optionally filtered by home.
 */
export async function getDevices(homeId?: string): Promise<DbDeviceWithChild[]> {
  const supabase = createSupabaseServerClient();
  let query = supabase
    .from("devices")
    .select("*, children(id, initials, age)")
    .order("device_name");
  if (homeId) query = query.eq("home_id", homeId);

  const { data, error } = await query;
  if (error) {
    console.error("[getDevices]", error.message);
    return [];
  }
  return data as DbDeviceWithChild[];
}

/**
 * Recent alerts with child and device details, newest first.
 * Default limit: 50.
 */
export async function getAlerts(limit = 50): Promise<DbAlert[]> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("alerts")
    .select("*, children(id, initials, age), devices(id, device_name, device_type)")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[getAlerts]", error.message);
    return [];
  }
  return data as DbAlert[];
}

/**
 * Reports for a given set of home IDs, newest first.
 */
export async function getReports(homeIds: string[]): Promise<DbReport[]> {
  if (homeIds.length === 0) return [];
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("reports")
    .select("*, homes(name), staff(full_name)")
    .in("home_id", homeIds)
    .order("generated_at", { ascending: false });

  if (error) {
    console.error("[getReports]", error.message);
    return [];
  }
  return data as DbReport[];
}

/**
 * Total count of all alerts.
 *
 * Note: the alerts table has no resolved/status column yet.
 * Add `.eq("resolved", false)` once that column exists.
 */
export async function getUnresolvedAlertCount(): Promise<number> {
  const supabase = createSupabaseServerClient();
  const { count, error } = await supabase
    .from("alerts")
    .select("*", { count: "exact", head: true });

  if (error) {
    console.error("[getUnresolvedAlertCount]", error.message);
    return 0;
  }
  return count ?? 0;
}
