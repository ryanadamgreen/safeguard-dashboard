"use client";

/*
 * Login page — 3-step flow:
 *   1. credentials  — email + password (signInWithPassword)
 *   2. otp          — 6-digit code sent via email
 *   3. forgot       — password reset via Supabase magic link
 *
 * Supabase creates a session immediately on signInWithPassword success.
 * If the user abandons OTP or it fails, we call signOut() to clear it.
 */

import { useState, useEffect } from "react";
import { createSupabaseBrowserClient } from "../lib/supabase";

const supabase = createSupabaseBrowserClient();

type Step = "credentials" | "otp" | "forgot";

export default function LoginPage() {
  const [step, setStep] = useState<Step>("credentials");

  // Credentials step
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // OTP step
  const [staffId, setStaffId] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);

  // Forgot password step
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSent, setForgotSent] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // ── Invite-acceptance flow ────────────────────────────────────────────────
  useEffect(() => {
    const hash = window.location.hash;
    if (!hash.includes("access_token") || !hash.includes("type=invite")) return;

    const params = new URLSearchParams(hash.slice(1));
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");
    if (!accessToken || !refreshToken) return;

    supabase.auth
      .setSession({ access_token: accessToken, refresh_token: refreshToken })
      .then(({ data: { session }, error }) => {
        if (error) { console.error("[invite] setSession error:", error.message); return; }
        if (session) window.location.replace("/set-password");
      });
  }, []);

  // ── Resend cooldown countdown ─────────────────────────────────────────────
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setInterval(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearInterval(t);
  }, [resendCooldown]);

  // ── Step 1: Credentials ───────────────────────────────────────────────────
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

      const uid = data.user!.id;
      setStaffId(uid);

      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ staffId: uid, email: email.toLowerCase().trim() }),
      });

      if (!res.ok) {
        setError("Failed to send verification code. Please try again.");
        await supabase.auth.signOut();
        setLoading(false);
        return;
      }

      setStep("otp");
      setResendCooldown(60);
    } catch {
      setError("An unexpected error occurred. Please try again.");
    }
    setLoading(false);
  }

  // ── Step 2: OTP verify ────────────────────────────────────────────────────
  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ staffId, code: otpCode }),
      });
      if (!res.ok) {
        const body = await res.json();
        setError(body.error ?? "Invalid code. Please try again.");
        setLoading(false);
        return;
      }
      window.location.replace("/dashboard");
    } catch {
      setError("An unexpected error occurred. Please try again.");
      setLoading(false);
    }
  }

  async function handleResend() {
    setError("");
    setResendCooldown(60);
    await fetch("/api/auth/send-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ staffId, email: email.toLowerCase().trim() }),
    });
  }

  // ── Step 3: Forgot password ───────────────────────────────────────────────
  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await supabase.auth.resetPasswordForEmail(forgotEmail.trim(), {
        redirectTo: `${window.location.origin}/set-password`,
      });
      setForgotSent(true); // always show success — don't reveal if email exists
    } catch {
      setError("An unexpected error occurred. Please try again.");
    }
    setLoading(false);
  }

  // ── Left panel (shared across all steps) ──────────────────────────────────
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

  const mobileLogoBar = (
    <div className="flex lg:hidden items-center gap-3 mb-10 justify-center">
      <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-blue-500">
        <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      </div>
      <span className="text-white font-semibold text-lg">SafeGuard</span>
    </div>
  );

  const errorBanner = error ? (
    <div className="flex items-center gap-2 p-3 bg-red-900/30 border border-red-800/50 rounded-lg text-red-400 text-sm">
      <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
      {error}
    </div>
  ) : null;

  const spinnerIcon = (
    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-950 flex">
      {leftPanel}

      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          {mobileLogoBar}

          {/* ── Step 1: Credentials ── */}
          {step === "credentials" && (
            <>
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
                  <div className="flex justify-end mt-1.5">
                    <button
                      type="button"
                      onClick={() => { setForgotEmail(email); setStep("forgot"); setError(""); }}
                      className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                    >
                      Forgot password?
                    </button>
                  </div>
                </div>

                {errorBanner}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition-colors mt-2"
                >
                  {loading ? <>{spinnerIcon} Signing in…</> : "Sign in"}
                </button>
              </form>

              <p className="text-center text-xs text-slate-600 mt-8">
                Protected by 256-bit encryption · GDPR compliant
              </p>
            </>
          )}

          {/* ── Step 2: OTP ── */}
          {step === "otp" && (
            <>
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 mb-6">
                <svg className="w-6 h-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>

              <h1 className="text-2xl font-bold text-white mb-1">Check your email</h1>
              <p className="text-slate-400 text-sm mb-8">
                We sent a 6-digit code to <span className="text-slate-300 font-medium">{email}</span>. Enter it below to continue.
              </p>

              <form onSubmit={handleVerifyOtp} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5" htmlFor="otp">
                    Verification code
                  </label>
                  <input
                    id="otp"
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                    placeholder="000000"
                    autoComplete="one-time-code"
                    className="w-full px-4 py-3 bg-slate-800 text-slate-100 placeholder-slate-600 border border-slate-700 rounded-lg text-2xl font-mono tracking-[0.5em] text-center focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-colors"
                  />
                </div>

                {errorBanner}

                <button
                  type="submit"
                  disabled={loading || otpCode.length < 6}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition-colors"
                >
                  {loading ? <>{spinnerIcon} Verifying…</> : "Verify code"}
                </button>
              </form>

              <div className="mt-5 flex flex-col items-center gap-3">
                <button
                  onClick={handleResend}
                  disabled={resendCooldown > 0}
                  className="text-sm text-blue-400 hover:text-blue-300 disabled:text-slate-500 disabled:cursor-not-allowed transition-colors"
                >
                  {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend code"}
                </button>

                <button
                  onClick={async () => {
                    await supabase.auth.signOut();
                    setStep("credentials");
                    setOtpCode("");
                    setError("");
                  }}
                  className="text-xs text-slate-500 hover:text-slate-400 transition-colors"
                >
                  ← Use a different account
                </button>
              </div>
            </>
          )}

          {/* ── Step 3: Forgot password ── */}
          {step === "forgot" && (
            <>
              <button
                onClick={() => { setStep("credentials"); setForgotSent(false); setError(""); }}
                className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-400 transition-colors mb-8"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
                Back to sign in
              </button>

              <h1 className="text-2xl font-bold text-white mb-1">Reset your password</h1>
              <p className="text-slate-400 text-sm mb-8">
                Enter your email and we&apos;ll send you a reset link.
              </p>

              {forgotSent ? (
                <div className="p-4 bg-emerald-900/30 border border-emerald-800/50 rounded-lg text-emerald-400 text-sm">
                  If that email is registered, a reset link has been sent. Check your inbox.
                </div>
              ) : (
                <form onSubmit={handleForgotPassword} className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1.5" htmlFor="forgot-email">
                      Email address
                    </label>
                    <input
                      id="forgot-email"
                      type="email"
                      autoComplete="email"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="you@organisation.org"
                      className="w-full px-4 py-2.5 bg-slate-800 text-slate-100 placeholder-slate-500 border border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-colors"
                    />
                  </div>

                  {errorBanner}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition-colors"
                  >
                    {loading ? <>{spinnerIcon} Sending…</> : "Send reset link"}
                  </button>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
