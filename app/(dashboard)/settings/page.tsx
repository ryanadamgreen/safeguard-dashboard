"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "../../components/AuthProvider";
import { useRouter } from "next/navigation";

// ── Constants ──────────────────────────────────────────────────────────────

const INACTIVITY_MS = 8 * 60 * 60 * 1000;  // 8 hours
const WARNING_MS    = 30 * 60 * 1000;       // warn 30 min before

// ── Helpers ────────────────────────────────────────────────────────────────

function maskEmail(email: string): string {
  const at = email.indexOf("@");
  if (at <= 1) return email;
  return `${email[0]}***${email.slice(at)}`;
}

// ── Styles ─────────────────────────────────────────────────────────────────

const inputClass = "w-full px-3 py-2 text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400";
const readonlyClass = "w-full px-3 py-2 text-sm text-slate-600 bg-slate-50 border border-slate-200 rounded-lg";

// ── Static data ────────────────────────────────────────────────────────────

const ACTIVE_SESSIONS = [
  {
    id: "current",
    device: "Windows 11 — Chrome 123",
    location: "Birmingham, United Kingdom",
    lastActive: "Active now",
    isCurrent: true,
  },
  {
    id: "mobile",
    device: "iPhone 15 — Safari 17",
    location: "Birmingham, United Kingdom",
    lastActive: "2 hours ago",
    isCurrent: false,
  },
];

type Channel = "email" | "inApp" | "both" | "none";

const CHANNEL_LABELS: Record<Channel, string> = {
  email: "Email", inApp: "In-App", both: "Both", none: "Off",
};

const INITIAL_PREFS = [
  { label: "Critical", color: "bg-red-50 text-red-700 ring-1 ring-red-600/20",          channel: "both"  as Channel },
  { label: "High",     color: "bg-orange-50 text-orange-700 ring-1 ring-orange-600/20",  channel: "both"  as Channel },
  { label: "Medium",   color: "bg-yellow-50 text-yellow-700 ring-1 ring-yellow-600/20",  channel: "inApp" as Channel },
  { label: "Low",      color: "bg-green-50 text-green-700 ring-1 ring-green-600/20",     channel: "none"  as Channel },
];

const SEVERITY_KEY = [
  {
    label: "Critical",
    color: "bg-red-50 text-red-700 ring-1 ring-red-600/20",
    items: [
      "Grooming language detected",
      "Self-harm keywords detected",
      "Nudity detected",
      "Sextortion risk keywords",
      "App uninstalled (tamper)",
      "VPN disabled (tamper)",
    ],
  },
  {
    label: "High",
    color: "bg-orange-50 text-orange-700 ring-1 ring-orange-600/20",
    items: [
      "Explicit content visible",
      "Unknown contact messaging",
      "Drug/alcohol references",
      "Suspicious contact pattern",
    ],
  },
  {
    label: "Medium",
    color: "bg-yellow-50 text-yellow-700 ring-1 ring-yellow-600/20",
    items: [
      "Late night usage",
      "App installed",
      "Social media flagged",
      "Blocked website attempt",
    ],
  },
  {
    label: "Low",
    color: "bg-green-50 text-green-700 ring-1 ring-green-600/20",
    items: [
      "Battery low",
      "Device offline 30+ mins",
    ],
  },
];

// ── Shared sub-components ─────────────────────────────────────────────────

function SectionHead({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-base font-semibold text-slate-800">{title}</h2>
      {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
    </div>
  );
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">{label}</label>
      {children}
    </div>
  );
}

function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-xl border border-slate-200 shadow-sm px-6 py-5 ${className ?? ""}`}>
      {children}
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const { user, selectedHomeId, setSelectedHomeId, setUser } = useAuth();
  const router = useRouter();

  // Section 1: Personal Details
  const [name, setName]             = useState(user?.name ?? "");
  const [detailsSaved, setDetailsSaved] = useState(false);

  // Section 2: Password
  const [current, setCurrent] = useState("");
  const [next, setNext]       = useState("");
  const [confirm, setConfirm] = useState("");
  const [pwError, setPwError]   = useState("");
  const [pwSuccess, setPwSuccess] = useState(false);

  // Section 2: 2FA test code
  const [testCodeSent, setTestCodeSent]         = useState(false);
  const [testCodeCooldown, setTestCodeCooldown] = useState(0);

  // Section 2: Active sessions
  const [sessionsSignedOut, setSessionsSignedOut] = useState(false);

  // Section 3: Notification prefs
  const [prefs, setPrefs]       = useState(INITIAL_PREFS);
  const [prefsSaved, setPrefsSaved] = useState(false);

  // Section 3: Test email
  const [testEmailLoading, setTestEmailLoading] = useState(false);
  const [testEmailStatus,  setTestEmailStatus]  = useState<"success" | "error" | null>(null);
  const [testEmailError,   setTestEmailError]   = useState<string | null>(null);

  // Session timeout warning
  const [sessionWarning, setSessionWarning]   = useState(false);
  const [warningMinsLeft, setWarningMinsLeft] = useState(30);
  const lastActivityRef   = useRef(Date.now());
  const warningActiveRef  = useRef(false);

  // ── 2FA cooldown countdown ───────────────────────────────────────────────
  useEffect(() => {
    if (testCodeCooldown <= 0) return;
    const id = setInterval(() => setTestCodeCooldown((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [testCodeCooldown]);

  // ── Inactivity / session timeout ─────────────────────────────────────────
  useEffect(() => {
    function resetActivity() {
      lastActivityRef.current = Date.now();
      if (warningActiveRef.current) {
        warningActiveRef.current = false;
        setSessionWarning(false);
      }
    }
    document.addEventListener("mousemove", resetActivity);
    document.addEventListener("keydown",   resetActivity);
    document.addEventListener("click",     resetActivity);

    const interval = setInterval(() => {
      const elapsed = Date.now() - lastActivityRef.current;
      if (elapsed >= INACTIVITY_MS) {
        setUser(null);
        router.push("/login");
      } else if (elapsed >= INACTIVITY_MS - WARNING_MS && !warningActiveRef.current) {
        warningActiveRef.current = true;
        setSessionWarning(true);
        setWarningMinsLeft(Math.max(1, Math.ceil((INACTIVITY_MS - elapsed) / 60000)));
      } else if (warningActiveRef.current) {
        setWarningMinsLeft(Math.max(1, Math.ceil((INACTIVITY_MS - elapsed) / 60000)));
      }
    }, 30000);

    return () => {
      document.removeEventListener("mousemove", resetActivity);
      document.removeEventListener("keydown",   resetActivity);
      document.removeEventListener("click",     resetActivity);
      clearInterval(interval);
    };
  }, [setUser, router]);

  // ── Handlers ─────────────────────────────────────────────────────────────

  function handleSaveDetails() {
    setDetailsSaved(true);
    setTimeout(() => setDetailsSaved(false), 2500);
  }

  function handleSavePassword() {
    setPwSuccess(false);
    if (!current || !next || !confirm) { setPwError("All fields are required."); return; }
    if (next !== confirm)              { setPwError("New passwords do not match."); return; }
    if (next.length < 8)               { setPwError("Password must be at least 8 characters."); return; }
    setPwError("");
    setPwSuccess(true);
    setCurrent(""); setNext(""); setConfirm("");
    setTimeout(() => setPwSuccess(false), 3000);
  }

  function handleSendTestCode() {
    if (testCodeCooldown > 0) return;
    setTestCodeSent(true);
    setTestCodeCooldown(60);
  }

  function handleSavePrefs() {
    setPrefsSaved(true);
    setTimeout(() => setPrefsSaved(false), 2500);
  }

  async function handleSendTestEmail() {
    setTestEmailLoading(true);
    setTestEmailStatus(null);
    setTestEmailError(null);
    try {
      const res = await fetch("/api/notifications/test-email", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ email: user?.email ?? "sarah@oakwoodhouse.org" }),
      });
      const json = await res.json() as { error?: string };
      if (res.ok) {
        setTestEmailStatus("success");
      } else {
        setTestEmailStatus("error");
        setTestEmailError(json.error ?? "Unknown error");
      }
    } catch (err) {
      setTestEmailStatus("error");
      setTestEmailError(err instanceof Error ? err.message : "Network error");
    } finally {
      setTestEmailLoading(false);
    }
  }

  function extendSession() {
    lastActivityRef.current = Date.now();
    warningActiveRef.current = false;
    setSessionWarning(false);
  }

  const hasMultipleHomes = (user?.homeIds?.length ?? 0) > 1;
  const maskedEmail      = user?.email ? maskEmail(user.email) : "";
  const jobTitleText     = user?.jobTitle ?? (user?.role === "READONLY_STAFF" ? "Read-only Access" : "—");

  return (
    <>
      {/* ── Session expiry warning banner ──────────────────────────────── */}
      {sessionWarning && (
        <div className="fixed top-0 inset-x-0 z-[100] flex items-center justify-between gap-4 px-6 py-3 bg-amber-500 shadow-lg">
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5 text-white flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm font-medium text-white">
              Your session will expire in {warningMinsLeft} minute{warningMinsLeft !== 1 ? "s" : ""}. Click to extend.
            </span>
          </div>
          <button
            onClick={extendSession}
            className="flex-shrink-0 px-3 py-1.5 text-sm font-semibold text-amber-700 bg-white rounded-lg hover:bg-amber-50 transition-colors"
          >
            Extend session
          </button>
        </div>
      )}

      <div className={`flex-1 flex flex-col${sessionWarning ? " mt-[52px]" : ""}`}>
        <header className="flex items-center justify-between px-8 py-5 bg-white border-b border-slate-200 flex-shrink-0">
          <div>
            <h1 className="text-xl font-semibold text-slate-800">Settings</h1>
            <p className="text-sm text-slate-500 mt-0.5">Manage your account and preferences</p>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-8">
          <div className="max-w-4xl space-y-12">

            {/* ─────────────────────────────────────────────────────────────
                Section 1 — Personal Details
            ───────────────────────────────────────────────────────────────*/}
            <section>
              <SectionHead title="Personal Details" />
              <Card>
                <div className="space-y-4 max-w-lg">
                  <FieldRow label="Full Name">
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className={inputClass}
                    />
                  </FieldRow>

                  <FieldRow label="Email Address">
                    <p className={readonlyClass}>{user?.email ?? "—"}</p>
                    <p className="text-xs text-slate-400 mt-1">
                      To change your email address contact your administrator.
                    </p>
                  </FieldRow>

                  <FieldRow label="Role">
                    <p className={readonlyClass}>{jobTitleText}</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Role set by administrator. Contact your administrator to change your role.
                    </p>
                  </FieldRow>

                  <div className="flex justify-end pt-2">
                    <button
                      onClick={handleSaveDetails}
                      className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                        detailsSaved
                          ? "bg-emerald-500 text-white"
                          : "bg-blue-600 text-white hover:bg-blue-700"
                      }`}
                    >
                      {detailsSaved ? "Saved!" : "Save Details"}
                    </button>
                  </div>
                </div>
              </Card>
            </section>

            {/* ─────────────────────────────────────────────────────────────
                Section 2 — Security
            ───────────────────────────────────────────────────────────────*/}
            <section>
              <SectionHead title="Security" />
              <div className="space-y-5">

                {/* Change Password */}
                <Card>
                  <p className="text-sm font-semibold text-slate-700 mb-1">Change Password</p>
                  <p className="text-xs text-slate-400 mb-4">Choose a strong password of at least 8 characters.</p>
                  <div className="space-y-4 max-w-lg">
                    <FieldRow label="Current Password">
                      <input type="password" value={current}
                        onChange={(e) => { setCurrent(e.target.value); setPwError(""); setPwSuccess(false); }}
                        className={inputClass} placeholder="Enter current password" />
                    </FieldRow>
                    <FieldRow label="New Password">
                      <input type="password" value={next}
                        onChange={(e) => { setNext(e.target.value); setPwError(""); setPwSuccess(false); }}
                        className={inputClass} placeholder="At least 8 characters" />
                    </FieldRow>
                    <FieldRow label="Confirm New Password">
                      <input type="password" value={confirm}
                        onChange={(e) => { setConfirm(e.target.value); setPwError(""); setPwSuccess(false); }}
                        className={inputClass} placeholder="Repeat new password" />
                    </FieldRow>
                    {pwError   && <p className="text-xs text-red-500">{pwError}</p>}
                    {pwSuccess && <p className="text-xs text-emerald-600">Password updated successfully.</p>}
                    <div className="flex justify-end pt-1">
                      <button onClick={handleSavePassword}
                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors">
                        Save Password
                      </button>
                    </div>
                  </div>
                </Card>

                {/* Two-Factor Authentication */}
                <Card>
                  <div className="flex items-start justify-between gap-6">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-semibold text-slate-700">Two-Factor Authentication</p>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          Active
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 leading-relaxed max-w-md">
                        Two-factor authentication is mandatory on your account. A verification code is sent
                        to your registered email each time you sign in.
                      </p>
                      <div className="flex items-center gap-1.5 mt-2">
                        <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        <span className="text-xs text-slate-500 font-mono">{maskedEmail}</span>
                      </div>
                      {testCodeSent && (
                        <p className="text-xs text-emerald-600 mt-2">
                          Test code sent to {maskedEmail}
                        </p>
                      )}
                    </div>
                    <div className="flex-shrink-0">
                      <button
                        onClick={handleSendTestCode}
                        disabled={testCodeCooldown > 0}
                        className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {testCodeCooldown > 0 ? `Resend in ${testCodeCooldown}s` : "Send test code"}
                      </button>
                    </div>
                  </div>
                </Card>

                {/* Active Sessions */}
                <Card>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-sm font-semibold text-slate-700">Active Sessions</p>
                      <p className="text-xs text-slate-400 mt-0.5">Devices currently signed in to your account</p>
                    </div>
                    <button
                      onClick={() => setSessionsSignedOut(true)}
                      disabled={sessionsSignedOut}
                      className="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 border border-red-100 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {sessionsSignedOut ? "All other sessions signed out" : "Sign out all other sessions"}
                    </button>
                  </div>
                  <div className="space-y-2">
                    {ACTIVE_SESSIONS
                      .filter((s) => !sessionsSignedOut || s.isCurrent)
                      .map((session) => (
                        <div
                          key={session.id}
                          className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${
                            session.isCurrent
                              ? "border-blue-200 bg-blue-50"
                              : "border-slate-200 bg-slate-50"
                          }`}
                        >
                          <div className={`flex items-center justify-center w-8 h-8 rounded-lg flex-shrink-0 ${
                            session.isCurrent ? "bg-blue-100" : "bg-slate-200"
                          }`}>
                            <svg className={`w-4 h-4 ${session.isCurrent ? "text-blue-600" : "text-slate-500"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-slate-700 truncate">{session.device}</p>
                            <p className="text-xs text-slate-400 truncate">{session.location}</p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className={`text-xs font-medium ${session.isCurrent ? "text-blue-600" : "text-slate-500"}`}>
                              {session.lastActive}
                            </p>
                            {session.isCurrent && (
                              <span className="text-[10px] text-blue-400">This device</span>
                            )}
                          </div>
                        </div>
                      ))}
                  </div>
                </Card>
              </div>
            </section>

            {/* ─────────────────────────────────────────────────────────────
                Section 3 — Alert Notifications
            ───────────────────────────────────────────────────────────────*/}
            <section>
              <SectionHead
                title="Alert Notifications"
                subtitle="Choose how you are notified when safeguarding alerts are triggered"
              />
              <div className="grid grid-cols-1 xl:grid-cols-[1fr_260px] gap-5">
                {/* Severity table */}
                <Card>
                  <div className="space-y-1">
                    {/* Column headers */}
                    <div className="grid grid-cols-[1fr_repeat(4,_auto)] gap-3 pb-2 mb-1 border-b border-slate-100">
                      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Severity</span>
                      {(["both", "email", "inApp", "none"] as Channel[]).map((c) => (
                        <span key={c} className="text-xs font-semibold text-slate-400 uppercase tracking-wider text-center w-14">
                          {CHANNEL_LABELS[c]}
                        </span>
                      ))}
                    </div>

                    {/* Rows */}
                    {prefs.map((pref, i) => (
                      <div key={pref.label} className="grid grid-cols-[1fr_repeat(4,_auto)] gap-3 items-center py-3 border-b border-slate-50 last:border-0">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold w-fit ${pref.color}`}>
                          {pref.label}
                        </span>
                        {(["both", "email", "inApp", "none"] as Channel[]).map((c) => (
                          <div key={c} className="flex justify-center w-14">
                            <button
                              onClick={() => setPrefs((prev) => prev.map((p, idx) => idx === i ? { ...p, channel: c } : p))}
                              className={`w-4 h-4 rounded-full border-2 transition-colors flex items-center justify-center ${
                                pref.channel === c
                                  ? "border-blue-600 bg-blue-600"
                                  : "border-slate-300 hover:border-blue-400"
                              }`}
                            >
                              {pref.channel === c && (
                                <span className="w-1.5 h-1.5 rounded-full bg-white" />
                              )}
                            </button>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100">
                    <p className="text-xs text-slate-400">
                      <strong className="text-slate-500">Both</strong> = email + in-app ·{" "}
                      <strong className="text-slate-500">In-App</strong> = dashboard only ·{" "}
                      <strong className="text-slate-500">Off</strong> = no notification
                    </p>
                    <button
                      onClick={handleSavePrefs}
                      className={`ml-4 flex-shrink-0 px-4 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                        prefsSaved
                          ? "bg-emerald-500 text-white"
                          : "bg-blue-600 text-white hover:bg-blue-700"
                      }`}
                    >
                      {prefsSaved ? "Saved!" : "Save"}
                    </button>
                  </div>

                  {/* Test email row */}
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
                    <div className="min-w-0">
                      {testEmailStatus === "success" && (
                        <p className="text-xs text-emerald-600 font-medium">
                          Test email sent to {maskedEmail}
                        </p>
                      )}
                      {testEmailStatus === "error" && (
                        <p className="text-xs text-red-500 font-medium">
                          {testEmailError ?? "Failed to send — check your connection and try again."}
                        </p>
                      )}
                      {testEmailStatus === null && (
                        <p className="text-xs text-slate-400">
                          Send a test critical alert email to verify your email notifications are working.
                        </p>
                      )}
                    </div>
                    <button
                      onClick={handleSendTestEmail}
                      disabled={testEmailLoading}
                      className="ml-4 flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {testEmailLoading ? (
                        <>
                          <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                          Sending…
                        </>
                      ) : (
                        <>
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                          Send test email
                        </>
                      )}
                    </button>
                  </div>
                </Card>

                {/* Severity key panel */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-5 py-5 space-y-4">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Severity Key</p>
                  {SEVERITY_KEY.map((cat) => (
                    <div key={cat.label}>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold mb-1.5 ${cat.color}`}>
                        {cat.label}
                      </span>
                      <ul className="space-y-1">
                        {cat.items.map((item) => (
                          <li key={item} className="flex items-center gap-1.5 text-xs text-slate-500">
                            <span className="w-1 h-1 rounded-full bg-slate-300 flex-shrink-0" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* ─────────────────────────────────────────────────────────────
                Section 4 — Home Preferences (multi-home only)
            ───────────────────────────────────────────────────────────────*/}
            {hasMultipleHomes && (
              <section>
                <SectionHead title="Home Preferences" subtitle="The home loaded when you first sign in" />
                <Card className="max-w-lg">
                  <FieldRow label="Default Home">
                    <div className="relative">
                      <select
                        value={selectedHomeId ?? user?.homeIds?.[0] ?? ""}
                        onChange={(e) => setSelectedHomeId(e.target.value)}
                        className={`${inputClass} appearance-none pr-8`}
                      >
                        {user?.homeIds?.map((id, i) => (
                          <option key={id} value={id}>{user.homeNames?.[i] ?? `Home ${id}`}</option>
                        ))}
                      </select>
                      <svg className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </FieldRow>
                </Card>
              </section>
            )}

            <div className="h-8" />
          </div>
        </main>
      </div>
    </>
  );
}
