import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createSupabaseServerClient } from "../../lib/supabase";
import { cookies } from "next/headers";

export async function POST(request: Request) {
  // Validate session
  const cookieStore = await cookies();
  const supabaseAuth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    name: string;
    primary_contact_name: string;
    primary_contact_email: string;
    phone?: string;
    address?: string;
    subscription_status?: string;
    trial_days?: number;
    stripe_customer_id?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { name, primary_contact_name, primary_contact_email, phone, address, subscription_status, trial_days, stripe_customer_id } = body;

  if (!name || !primary_contact_name || !primary_contact_email) {
    return NextResponse.json({ error: "name, primary_contact_name and primary_contact_email are required" }, { status: 400 });
  }

  const trialExpiresAt = trial_days
    ? new Date(Date.now() + trial_days * 24 * 60 * 60 * 1000).toISOString()
    : null;

  const supabase = createSupabaseServerClient();

  const { data: org, error } = await supabase
    .from("organisations")
    .insert({
      name,
      primary_contact_name,
      primary_contact_email,
      phone: phone || null,
      address: address || null,
      subscription_status: subscription_status ?? "trialing",
      trial_expires_at: trialExpiresAt,
      stripe_customer_id: stripe_customer_id || null,
      created_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error("[POST /api/organisations] insert failed:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ org }, { status: 201 });
}
