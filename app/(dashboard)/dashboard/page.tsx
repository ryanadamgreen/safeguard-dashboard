export const dynamic = 'force-dynamic';

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createSupabaseServerClient } from "../../lib/supabase";
import { getAlerts, getDevices, getChildren } from "../../lib/supabase/queries";
import DashboardClient from "../DashboardClient";

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const anonClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll() {},
      },
    }
  );
  const { data: { user } } = await anonClient.auth.getUser();

  let subscriptionStatus: string | null = null;
  let trialExpiresAt: string | null = null;

  if (user?.email) {
    const serviceClient = createSupabaseServerClient();

    const { data: staffRow } = await serviceClient
      .from("staff")
      .select("organisation_id")
      .eq("email", user.email)
      .single();

    if (staffRow?.organisation_id) {
      const { data: org } = await serviceClient
        .from("organisations")
        .select("subscription_status, trial_expires_at")
        .eq("id", staffRow.organisation_id)
        .single();

      subscriptionStatus = org?.subscription_status ?? null;
      trialExpiresAt = org?.trial_expires_at ?? null;
    }
  }

  const [dbAlerts, dbDevices, dbChildren] = await Promise.all([
    getAlerts(50),
    getDevices(),
    getChildren(),
  ]);

  return (
    <DashboardClient
      dbAlerts={dbAlerts}
      dbDevices={dbDevices}
      dbChildren={dbChildren}
      subscriptionStatus={subscriptionStatus}
      trialExpiresAt={trialExpiresAt}
    />
  );
}
