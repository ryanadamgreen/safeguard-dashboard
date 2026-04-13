"use client";

import { useEffect } from "react";
import { createSupabaseBrowserClient } from "../lib/supabase";
import { mapDbRole } from "../lib/auth";

const supabase = createSupabaseBrowserClient();

/**
 * /dashboard — catch-all redirect.
 *
 * Supabase email templates often link here (Site URL + /dashboard).
 * We immediately check the session and send the user to the right place.
 */
export default function DashboardRedirectPage() {
  useEffect(() => {
    async function redirect() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        window.location.href = "/login";
        return;
      }
      const { data: rpcRole } = await supabase.rpc("get_staff_role");
      const role = mapDbRole(rpcRole ?? "home_staff");
      window.location.href = role === "ADMIN" ? "/admin" : "/";
    }
    redirect();
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="flex items-center gap-3 text-slate-400">
        <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <span className="text-sm">Redirecting…</span>
      </div>
    </div>
  );
}
