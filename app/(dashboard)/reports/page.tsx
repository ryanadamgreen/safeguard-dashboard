export const dynamic = "force-dynamic";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createSupabaseServerClient } from "../../lib/supabase";
import { getReports } from "../../lib/supabase/queries";
import ReportsClient from "./ReportsClient";

export default async function ReportsPage() {
  const cookieStore = await cookies();

  const anonClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll(); }, setAll() {} } }
  );
  const { data: { user } } = await anonClient.auth.getUser();

  let homeIds: string[] = [];
  if (user?.id) {
    const serviceClient = createSupabaseServerClient();
    const { data: staffHomes } = await serviceClient
      .from("staff_homes")
      .select("home_id")
      .eq("staff_id", user.id);
    homeIds = (staffHomes ?? []).map((sh: { home_id: string }) => sh.home_id);
  }

  const reports = await getReports(homeIds);
  return <ReportsClient reports={reports} />;
}
