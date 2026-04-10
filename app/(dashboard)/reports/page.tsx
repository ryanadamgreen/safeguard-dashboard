export const dynamic = "force-dynamic";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createSupabaseServerClient } from "../../lib/supabase";
import {
  getReports,
  getReportSchedules,
  getChildrenForHomes,
} from "../../lib/supabase/queries";
import ReportsClient from "./ReportsClient";

export default async function ReportsPage() {
  const cookieStore = await cookies();

  const anonClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll(); }, setAll() {} } }
  );
  const { data: { user } } = await anonClient.auth.getUser();

  let currentUserName = "";
  let homeIds: string[] = [];
  let homes: { id: string; name: string }[] = [];

  if (user?.id) {
    const serviceClient = createSupabaseServerClient();

    const { data: staffHomes } = await serviceClient
      .from("staff_homes")
      .select("home_id, homes(id, name)")
      .eq("staff_id", user.id);

    if (staffHomes) {
      for (const sh of staffHomes) {
        const raw = sh.homes;
        const h = (Array.isArray(raw) ? raw[0] : raw) as { id: string; name: string } | null;
        if (h) {
          homeIds.push(h.id);
          homes.push({ id: h.id, name: h.name });
        }
      }
    }

    // Fetch current user's name for report attribution
    const { data: staffRow } = await serviceClient
      .from("staff")
      .select("full_name")
      .eq("id", user.id)
      .single();
    if (staffRow?.full_name) currentUserName = staffRow.full_name;
  }

  const [reports, schedules, children] = await Promise.all([
    getReports(homeIds),
    getReportSchedules(homeIds),
    getChildrenForHomes(homeIds),
  ]);

  return (
    <ReportsClient
      reports={reports}
      schedules={schedules}
      children={children}
      homes={homes}
      currentUserName={currentUserName}
    />
  );
}
