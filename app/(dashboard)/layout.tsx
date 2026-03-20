import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createSupabaseServerClient } from "../lib/supabase";
import Sidebar from "../components/Sidebar";
import { RouteGuard } from "../components/RouteGuard";
import { SubscriptionWrapper } from "../components/SubscriptionWrapper";
import { getUnresolvedAlertCount } from "../lib/supabase/queries";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [initialAlertCount, subscriptionStatus] = await Promise.all([
    getUnresolvedAlertCount(),
    getSubscriptionStatus(),
  ]);

  return (
    <RouteGuard allow={["HOME_STAFF", "READONLY_STAFF"]} redirectTo="/login">
      <div className="flex min-h-screen bg-slate-50">
        <Sidebar initialAlertCount={initialAlertCount} />
        <div className="flex-1 flex flex-col min-w-0 overflow-y-auto h-screen">
          <SubscriptionWrapper subscriptionStatus={subscriptionStatus}>
            {children}
          </SubscriptionWrapper>
        </div>
      </div>
    </RouteGuard>
  );
}

async function getSubscriptionStatus(): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    const anonClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll() { return cookieStore.getAll(); }, setAll() {} } }
    );
    const { data: { user } } = await anonClient.auth.getUser();
    if (!user?.email) return null;

    const serviceClient = createSupabaseServerClient();
    const { data: staffRow } = await serviceClient
      .from("staff")
      .select("organisation_id")
      .eq("email", user.email)
      .single();
    if (!staffRow?.organisation_id) return null;

    const { data: org } = await serviceClient
      .from("organisations")
      .select("subscription_status")
      .eq("id", staffRow.organisation_id)
      .single();

    return org?.subscription_status ?? null;
  } catch {
    return null;
  }
}
