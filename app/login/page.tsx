"use client";

/*
 * Password-based login (replaces OTP flow).
 *
 * To set a password for an existing user, run in Supabase SQL editor:
 *   UPDATE auth.users
 *   SET encrypted_password = crypt('your-password', gen_salt('bf'))
 *   WHERE email = 'rgmediaukltd@gmail.com';
 *
 * Or: Authentication → Users → click user → "Send password recovery"
 * and set a new password via the recovery link.
 */

import { useState } from "react";
import { createSupabaseBrowserClient } from "../lib/supabase";

const supabase = createSupabaseBrowserClient();

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { data, error: signInErr } = await supabase.auth.signInWithPassword({
        email: email.toLowerCase().trim(),
        password,
      });
      if (signInErr) {
        setError(signInErr.message ?? "Invalid email or password.");
        setLoading(false);
        return;
      }
      console.log("[login] signInWithPassword success, user:", data.user?.email);
      console.log("[login] redirecting to /admin...");
      window.location.replace("/admin");
    } catch {
      setError("An unexpected error occurred. Please try again.");
      setLoading(false);
    }
  }

  // ── Left panel ─────────────────────────────────────────────────────────────
  const leftPanel = (
    <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 bg-slate-900 border-r border-slate-800">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-blue-500">
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        </div>
        <span className="text-white font-semibold text-lg tracking-tight">SafeGuard</span>
      </div>

      <div>
        <div className="mb-8 flex items-center gap-3">
          <span className="w-8 h-px bg-blue-500" />
          <span className="text-blue-400 text-xs font-semibold uppercase tracking-widest">Residential Monitoring</span>
        </div>
        <h2 className="text-4xl font-bold text-white leading-tight mb-4">
          Protecting children.<br />
          <span className="text-blue-400">Every hour of the day.</span>
        </h2>
        <p className="text-slate-400 text-base leading-relaxed max-w-sm">
          Real-time safeguarding alerts, device monitoring, and compliance reporting for children&apos;s residential homes.
        </p>
        <div className="mt-12 grid grid-cols-3 gap-6">
          {[
            { label: "Active Homes", value: "48" },
            { label: "Children Monitored", value: "312" },
            { label: "Alerts Resolved", value: "99.2%" },
          ].map((s) => (
            <div key={s.label}>
              <p className="text-2xl font-bold text-white">{s.value}</p>
              <p className="text-xs text-slate-500 mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3 p-4 bg-slate-800/60 rounded-xl border border-slate-700/50">
        <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 font-semibold text-sm flex-shrink-0">
          SJ
        </div>
        <div>
          <p className="text-sm font-medium text-slate-200">&ldquo;SafeGuard transformed how we handle digital safeguarding.&rdquo;</p>
          <p className="text-xs text-slate-500 mt-0.5">Sarah Johnson, Registered Manager — Oakwood House</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 flex">
      {leftPanel}

      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-3 mb-10 justify-center">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-blue-500">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <span className="text-white font-semibold text-lg">SafeGuard</span>
          </div>

          <h1 className="text-2xl font-bold text-white mb-1">Welcome back</h1>
          <p className="text-slate-400 text-sm mb-8">Sign in to your account</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5" htmlFor="email">
                Email address
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@organisation.org"
                className="w-full px-4 py-2.5 bg-slate-800 text-slate-100 placeholder-slate-500 border border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-2.5 bg-slate-800 text-slate-100 placeholder-slate-500 border border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-colors"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-900/30 border border-red-800/50 rounded-lg text-red-400 text-sm">
                <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition-colors mt-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Signing in…
                </>
              ) : (
                "Sign in"
              )}
            </button>
          </form>

          <p className="text-center text-xs text-slate-600 mt-8">
            Protected by 256-bit encryption · GDPR compliant
          </p>
        </div>
      </div>
    </div>
  );
}
