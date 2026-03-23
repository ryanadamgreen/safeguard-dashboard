import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createSupabaseServerClient } from "../../lib/supabase";
import { cookies } from "next/headers";

/**
 * GET /api/me
 *
 * Returns the staff profile for the currently authenticated user.
 * Uses the service-role client to read from the staff table, so this
 * works regardless of RLS policy configuration on the staff table.
 *
 * The session is validated first using the anon SSR client (reads the
 * cookie set by signInWithPassword). If there is no valid session,
 * returns 401.
 */
export async function GET(request: Request) {
  const cookieStore = await cookies();

  // Validate the session using the SSR anon client (reads browser cookie)
  const supabaseAuth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();

  if (authError || !user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Fetch the staff profile using the service-role client (bypasses RLS)
  const supabaseAdmin = createSupabaseServerClient();

  const { data: staff, error: staffError } = await supabaseAdmin
    .from("staff")
    .select("id, full_name, email, job_title, role")
    .eq("id", user.id)
    .single();

  if (staffError || !staff) {
    console.error("[/api/me] staff lookup failed:", staffError?.message, "uid:", user.id);
    return NextResponse.json({ error: "Staff profile not found" }, { status: 404 });
  }

  console.log("[/api/me] returning staff:", { id: staff.id, full_name: staff.full_name, email: staff.email, role: staff.role });
  return NextResponse.json({ staff }, {
    headers: { "Cache-Control": "no-store" },
  });
}
