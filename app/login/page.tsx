"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "../lib/supabase";
import { mapDbRole } from "../lib/auth";

const supabase = createSupabaseBrowserClient();

const OTP_EXPIRY_SECS = 10 * 60;
const RESEND_COOLDOWN_SECS = 60;

function maskEmail(email: string): string {
  const at = email.indexOf("@");
  if (at <= 1) return email;
  return email[0] + "***" + email.slice(at);
}

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [step, setStep] = useState<"email" | "otp">("email");
  const [pendingEmail, setPendingEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [otpError, setOtpError] = useState("");
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [expirySecsLeft, setExpirySecsLeft] = useState(OTP_EXPIRY_SECS);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendCount, setResendCount] = useState(0);

  const otpInputRef = useRef<HTMLInputElement>(null);
  const expiryIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const resendIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const router = useRouter();

  useEffect(() => {
    return () => {
      if (expiryIntervalRef.current) clearInterval(expiryIntervalRef.current);
      if (resendIntervalRef.current) clearInterval(resendIntervalRef.current);
    };
  }, []);

  function startExpiryCountdown() {
    if (expiryIntervalRef.current) clearInterval(expiryIntervalRef.current);
    setExpirySecsLeft(OTP_EXPIRY_SECS);
    expiryIntervalRef.current = setInterval(() => {
      setExpirySecsLeft((s) => {
        if (s <= 1) { clearInterval(expiryIntervalRef.current!); return 0; }
        return s - 1;
      });
    }, 1000);
  }

  function startResendCooldown() {
    if (resendIntervalRef.current) clearInterval(resendIntervalRef.current);
    setResendCooldown(RESEND_COOLDOWN_SECS);
    resendIntervalRef.current = setInterval(() => {
      setResendCooldown((s) => {
        if (s <= 1) { clearInterval(resendIntervalRef.current!); return 0; }
        return s - 1;
      });
    }, 1000);
  }

  function formatCountdown(secs: number): string {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  }

  // ── Step 1: send OTP ────────────────────────────────────────────────────────
  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const normalised = email.toLowerCase().trim();
    if (!normalised) { setError("Please enter your email address."); return; }

    setLoading(true);
    try {
      const { error: otpErr } = await supabase.auth.signInWithOtp({
        email: normalised,
        options: { shouldCreateUser: false },
      });
      if (otpErr) {
        setError(otpErr.message ?? "Failed to send code. Please try again.");
        setLoading(false);
        return;
      }
      setPendingEmail(normalised);
      setOtp("");
      setOtpError("");
      setResendCount(0);
      setStep("otp");
      startExpiryCountdown();
      startResendCooldown();
      setTimeout(() => otpInputRef.current?.focus(), 50);
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  // ── Step 2: verify OTP ─────────────────────────────────────────────────────
  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setOtpError("");
    if (otp.length < 6) { setOtpError("Please enter the 6-digit code."); return; }
    if (expirySecsLeft === 0) { setOtpError("Your code has expired. Please request a new one."); return; }

    setOtpVerifying(true);
    try {
      const verifyResult = await supabase.auth.verifyOtp({
        email: pendingEmail,
        token: otp,
        type: "email",
      });
      console.log("[verifyOtp] result:", JSON.stringify(verifyResult, null, 2));

      const { data, error: verifyErr } = verifyResult;
      if (verifyErr || !data.user) {
        setOtpVerifying(false);
        setOtpError("Incorrect code. Please try again.");
        setOtp("");
        setTimeout(() => otpInputRef.current?.focus(), 50);
        return;
      }

      // Use the get_staff_role RPC — it's a SECURITY DEFINER function that
      // bypasses RLS and reliably returns the current user's role.
      const { data: rpcRole, error: rpcErr } = await supabase.rpc("get_staff_role");
      console.log("[verifyOtp] get_staff_role:", rpcRole, rpcErr);

      const role = mapDbRole(rpcRole ?? "home_staff");
      const dest = role === "ADMIN" ? "/admin" : "/";
      console.log("[verifyOtp] redirecting to:", dest);

      // Layer 1: Next.js soft navigation (immediate).
      router.replace(dest);

      // Layer 2: hard navigation after 500ms — fires if router.replace stalled
      // (seen on Vercel when the middleware cookie check races the client router).
      setTimeout(() => { window.location.href = dest; }, 500);

      // Layer 3: full reload after 2s — session cookie is confirmed set,
      // so a reload will re-hit middleware which will redirect to dest.
      setTimeout(() => { window.location.reload(); }, 2000);
    } catch (err) {
      console.error("[verifyOtp] caught:", err);
      setOtpVerifying(false);
      setOtpError("Verification failed. Please try again.");
    }
  }

  // ── Resend ─────────────────────────────────────────────────────────────────
  async function handleResend() {
    if (resendCooldown > 0) return;
    setOtp("");
    setOtpError("");
    setResendCount((n) => n + 1);
    await supabase.auth.signInWithOtp({
      email: pendingEmail,
      options: { shouldCreateUser: false },
    });
    startExpiryCountdown();
    startResendCooldown();
    setTimeout(() => otpInputRef.current?.focus(), 50);
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

  // ─────────────────────────────────────────────────────────────────────────
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

          {/* ── STEP: email ───────────────────────────────────────────────── */}
          {step === "email" && (
            <>
              <h1 className="text-2xl font-bold text-white mb-1">Welcome back</h1>
              <p className="text-slate-400 text-sm mb-8">Enter your email to receive a sign-in code</p>

              <form onSubmit={handleEmailSubmit} className="space-y-5">
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
                      Sending code…
                    </>
                  ) : (
                    "Send sign-in code"
                  )}
                </button>
              </form>

              <p className="text-center text-xs text-slate-600 mt-8">
                Protected by 256-bit encryption · GDPR compliant
              </p>
            </>
          )}

          {/* ── STEP: OTP ────────────────────────────────────────────────── */}
          {step === "otp" && (
            <>
              <div className="flex justify-center mb-6">
                <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/20">
                  <svg className="w-7 h-7 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
              </div>

              <h1 className="text-2xl font-bold text-white mb-1 text-center">Check your email</h1>
              <p className="text-slate-400 text-sm mb-2 text-center">
                We sent a 6-digit code to{" "}
                <span className="text-slate-300 font-medium">{maskEmail(pendingEmail)}</span>
              </p>

              {/* Expiry countdown */}
              <div className="flex items-center justify-center gap-1.5 mb-6">
                {expirySecsLeft > 0 ? (
                  <>
                    <svg className="w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className={`text-xs font-mono ${expirySecsLeft < 60 ? "text-red-400" : "text-slate-500"}`}>
                      Expires in {formatCountdown(expirySecsLeft)}
                    </span>
                  </>
                ) : (
                  <span className="text-xs text-red-400 font-medium">Code expired — request a new one below</span>
                )}
              </div>

              <form onSubmit={handleVerify} className="space-y-4">
                <div>
                  <input
                    ref={otpInputRef}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "").slice(0, 6);
                      setOtp(val);
                      setOtpError("");
                    }}
                    placeholder="000000"
                    disabled={otpVerifying}
                    className={`w-full px-4 py-3 text-center text-2xl font-mono tracking-[0.5em] bg-slate-800 border rounded-lg text-slate-100 placeholder-slate-700 focus:outline-none focus:ring-2 transition-colors ${
                      otpError
                        ? "border-red-500/60 focus:ring-red-500/40 focus:border-red-500"
                        : "border-slate-700 focus:ring-blue-500/40 focus:border-blue-500"
                    }`}
                  />
                </div>

                {otpError && (
                  <div className="flex items-center gap-2 p-3 bg-red-900/30 border border-red-800/50 rounded-lg text-red-400 text-sm">
                    <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    {otpError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={otpVerifying || otp.length < 6 || expirySecsLeft === 0}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition-colors"
                >
                  {otpVerifying ? (
                    <>
                      <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Verifying…
                    </>
                  ) : (
                    "Verify code"
                  )}
                </button>
              </form>

              <div className="mt-5 flex flex-col items-center gap-2">
                <div className="text-sm text-slate-500">
                  Didn&apos;t receive a code?{" "}
                  {resendCooldown > 0 ? (
                    <span className="text-slate-600">Resend in {resendCooldown}s</span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleResend}
                      className="text-blue-400 hover:text-blue-300 transition-colors font-medium"
                    >
                      Resend code{resendCount > 0 ? ` (${resendCount})` : ""}
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setStep("email");
                    if (expiryIntervalRef.current) clearInterval(expiryIntervalRef.current);
                    if (resendIntervalRef.current) clearInterval(resendIntervalRef.current);
                  }}
                  className="text-xs text-slate-600 hover:text-slate-400 transition-colors"
                >
                  ← Use a different email
                </button>
              </div>

              <p className="text-center text-xs text-slate-600 mt-6">
                Protected by 256-bit encryption · GDPR compliant
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
