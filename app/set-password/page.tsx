"use client";

/**
 * Set-password page.
 * Reached directly from the Supabase invite email (redirectTo points here).
 * The URL hash contains #access_token=...&refresh_token=...&type=invite.
 * We parse those tokens on mount, call setSession() to establish the session
 * in cookies, then let the user choose a password via updateUser().
 */

import { useState, useEffect, useRef } from "react";
import { createSupabaseBrowserClient } from "../lib/supabase";

const supabase = createSupabaseBrowserClient();

export default function SetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [error, setError] = useState("");
  const sessionEstablished = useRef(false);

  // ── Extract tokens from URL and establish session ──────────────────────
  // Handles two flows:
  //   1. Invite link  — hash contains #access_token=...&type=invite
  //   2. Password reset — query string contains ?code=... (PKCE flow)
  useEffect(() => {
    if (sessionEstablished.current) return;
    sessionEstablished.current = true;

    const hash = window.location.hash;
    const search = window.location.search;
    console.log("[set-password] hash:", hash, "search:", search);

    // ── PKCE recovery flow (password reset emails) ───────────────────────
    const searchParams = new URLSearchParams(search);
    const code = searchParams.get("code");
    if (code) {
      supabase.auth
        .exchangeCodeForSession(code)
        .then(({ data: { session }, error: sessionErr }) => {
          if (sessionErr || !session) {
            console.error("[set-password] exchangeCodeForSession error:", sessionErr?.message);
            setError("This reset link has expired or already been used. Please request a new one.");
            return;
          }
          console.log("[set-password] recovery session established for", session.user.email);
          history.replaceState(null, "", window.location.pathname);
          setSessionReady(true);
        });
      return;
    }

    // ── Hash token flow (invite emails) ─────────────────────────────────
    const hashParams = new URLSearchParams(hash.slice(1));
    const accessToken = hashParams.get("access_token");
    const refreshToken = hashParams.get("refresh_token");

    if (!accessToken || !refreshToken) {
      // No tokens — check if a session already exists (e.g. navigated here directly
      // or arrived after OTP login which already established a session)
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
          console.log("[set-password] existing session found");
          setSessionReady(true);
        } else {
          // No session and no tokens — still allow the form but show error on submit
          setSessionReady(true);
          setError("No active session found. Please use the reset link from your email or sign in first.");
        }
      });
      return;
    }

    supabase.auth
      .setSession({ access_token: accessToken, refresh_token: refreshToken })
      .then(({ data: { session }, error: sessionErr }) => {
        if (sessionErr || !session) {
          console.error("[set-password] setSession error:", sessionErr?.message);
          setError("Invalid or expired invite link. Please ask an admin to resend the invitation.");
          return;
        }
        console.log("[set-password] session established for", session.user.email);
        history.replaceState(null, "", window.location.pathname);
        setSessionReady(true);
      });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const { error: updateErr } = await supabase.auth.updateUser({ password });
      if (updateErr) {
        setError(updateErr.message ?? "Failed to set password. Please try again.");
        setLoading(false);
        return;
      }
      // Password set — go to the role-based redirect page
      window.location.replace("/dashboard");
    } catch {
      setError("An unexpected error occurred. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex">
      {/* Left panel */}
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
            Welcome to<br />
            <span className="text-blue-400">SafeGuard.</span>
          </h2>
          <p className="text-slate-400 text-base leading-relaxed max-w-sm">
            Set a secure password to complete your account setup. You&apos;ll use it every time you sign in.
          </p>
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

      {/* Right panel */}
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

          <h1 className="text-2xl font-bold text-white mb-1">Set your password</h1>
          <p className="text-slate-400 text-sm mb-8">Choose a secure password to complete your account setup.</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5" htmlFor="password">
                New password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                className="w-full px-4 py-2.5 bg-slate-800 text-slate-100 placeholder-slate-500 border border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5" htmlFor="confirm">
                Confirm password
              </label>
              <input
                id="confirm"
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
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
              disabled={loading || !sessionReady}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition-colors mt-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Setting password…
                </>
              ) : (
                "Set password & continue"
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
