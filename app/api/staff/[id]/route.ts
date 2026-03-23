import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

function createSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: staffId } = await params;

  // Validate the caller is authenticated
  const cookieStore = await cookies();
  const supabaseAuth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll() {},
      },
    }
  );
  const { data: { user } } = await supabaseAuth.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createSupabaseAdmin();

  // 1. Delete staff_homes rows
  const { error: homesError } = await supabase
    .from("staff_homes")
    .delete()
    .eq("staff_id", staffId);

  if (homesError) {
    console.error("[DELETE /api/staff/[id]] staff_homes", homesError.message);
    return NextResponse.json({ error: homesError.message }, { status: 500 });
  }

  // 2. Delete the staff row
  const { error: staffError } = await supabase
    .from("staff")
    .delete()
    .eq("id", staffId);

  if (staffError) {
    console.error("[DELETE /api/staff/[id]] staff", staffError.message);
    return NextResponse.json({ error: staffError.message }, { status: 500 });
  }

  // 3. Delete the auth user (best-effort — staff row is already gone)
  const { error: authError } = await supabase.auth.admin.deleteUser(staffId);
  if (authError) {
    console.error("[DELETE /api/staff/[id]] auth.admin.deleteUser", authError.message);
    // Don't fail the request — DB is clean, auth cleanup is non-critical
  }

  return NextResponse.json({ success: true });
}
