"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../components/AuthProvider";
import { roleLabel } from "../../lib/auth";
import { updateStaff } from "../../lib/supabase/actions";

// ─── Constants ────────────────────────────────────────────────────────────────

const INACTIVITY_MS = 8 * 60 * 60 * 1000;   // 8 hours
const WARNING_MS    = 30 * 60 * 1000;         // show warning at 30 min remaining

const ACTIVE_SESSIONS = [
  {
    id: 1,
    device: "Windows 11 · Chrome 123",
    location: "Birmingham, UK",
    lastActive: "Active now",
    isCurrent: true,
  },
  {
    id: 2,
    device: "iPhone 15 · Safari",
    location: "Birmingham, UK",
    lastActive: "2 hours ago",
    isCurrent: false,
  },
];

function maskEmail(email: string): string {
  const at = email.indexOf("@");
  if (at <= 1) return email;
  return email[0] + "***" + email.slice(at);
}

// ─── Shared ───────────────────────────────────────────────────────────────────

function SectionHeading({ number, title }: { number: number; title: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="flex items-center justify-center w-7 h-7 rounded-full bg-blue-600 text-white text-xs font-bold flex-shrink-0">
        {number}
      </div>
      <h2 className="text-base font-semibold text-slate-800">{title}</h2>
    </div>
  );
}

const inputClass = "w-full px-3 py-2 text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400";
const readOnlyClass = "w-full px-3 py-2 text-sm text-slate-500 bg-slate-50/50 border border-slate-200 rounded-lg cursor-default select-none";

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">
      {children}
    </label>
  );
}

function Divider() {
  return <hr className="border-slate-100 my-8" />;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminSettingsPage() {
  const { user, setUser } = useAuth();
  const router = useRouter();

  // ── Session inactivity ──────────────────────────────────────────────────────
  const lastActivityRef = useRef(Date.now());
  const warningActiveRef = useRef(false);
  const [showWarning, setShowWarning] = useState(false);
  const [warningMinsLeft, setWarningMinsLeft] = useState(30);

  useEffect(() => {
    function resetActivity() { lastActivityRef.current = Date.now(); }
    window.addEventListener("mousemove", resetActivity);
    window.addEventListener("keydown", resetActivity);
    window.addEventListener("click", resetActivity);

    const interval = setInterval(() => {
      const idle = Date.now() - lastActivityRef.current;
      const remaining = INACTIVITY_MS - idle;

      if (remaining <= 0) {
        setUser(null);
        router.push("/login");
        return;
      }
      if (remaining <= WARNING_MS && !warningActiveRef.current) {
        warningActiveRef.current = true;
        setShowWarning(true);
      }
      if (warningActiveRef.current) {
        setWarningMinsLeft(Math.ceil(remaining / 60000));
      }
    }, 30_000);

    return () => {
      window.removeEventListener("mousemove", resetActivity);
      window.removeEventListener("keydown", resetActivity);
      window.removeEventListener("click", resetActivity);
      clearInterval(interval);
    };
  }, [setUser, router]);

  // ── Section 1: Personal Details ────────────────────────────────────────────
  // null = not yet edited by the user; fall through to user.name / user.email
  const [name, setName]         = useState<string | null>(null);
  const [email, setEmail]       = useState<string | null>(null);
  const [profileSaved, setProfileSaved] = useState(false);
  const [profileError, setProfileError] = useState("");

  // Derive the displayed value: local edit overrides auth data
  const displayName  = name  ?? user?.name  ?? "";
  const displayEmail = email ?? user?.email ?? "";

  async function handleSaveProfile() {
    if (!user) return;
    setProfileError("");
    const { error } = await updateStaff(user.id, {
      full_name: displayName.trim(),
      email: displayEmail.trim(),
    });
    if (error) {
      setProfileError(error);
      return;
    }
    setUser({ ...user, name: displayName.trim(), email: displayEmail.trim() });
    // Reset local edits so inputs reflect the updated auth object
    setName(null);
    setEmail(null);
    setProfileSaved(true);
    setTimeout(() => setProfileSaved(false), 2000);
  }

  // ── Section 2: Security – password ────────────────────────────────────────
  const [current, setCurrent]   = useState("");
  const [next, setNext]         = useState("");
  const [confirm, setConfirm]   = useState("");
  const [pwError, setPwError]   = useState("");
  const [pwSaved, setPwSaved]   = useState(false);

  function handlePasswordSave() {
    if (!current || !next || !confirm) { setPwError("All fields are required"); return; }
    if (next !== confirm)               { setPwError("New passwords do not match"); return; }
    if (next.length < 8)                { setPwError("Password must be at least 8 characters"); return; }
    setPwError("");
    setCurrent(""); setNext(""); setConfirm("");
    setPwSaved(true);
    setTimeout(() => setPwSaved(false), 2000);
  }

  // ── Section 2: Security – 2FA ─────────────────────────────────────────────
  const [testCodeCooldown, setTestCodeCooldown] = useState(0);
  const testCodeIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function handleSendTestCode() {
    if (testCodeCooldown > 0) return;
    setTestCodeCooldown(60);
    testCodeIntervalRef.current = setInterval(() => {
      setTestCodeCooldown((s) => {
        if (s <= 1) { clearInterval(testCodeIntervalRef.current!); return 0; }
        return s - 1;
      });
    }, 1000);
  }

  // ── Section 2: Security – Active Sessions ─────────────────────────────────
  const [sessions, setSessions] = useState(ACTIVE_SESSIONS);
  const [sessionsSignedOut, setSessionsSignedOut] = useState(false);

  function signOutOtherSessions() {
    setSessions((prev) => prev.filter((s) => s.isCurrent));
    setSessionsSignedOut(true);
  }

  // ── Section 3: Notifications ──────────────────────────────────────────────
  const [notifPrefs, setNotifPrefs] = useState({
    newHomeRegistrations: true,
    staffAccountCreated:  true,
    subscriptionChanges:  false,
    systemAlerts:         true,
  });

  function toggleNotif(key: keyof typeof notifPrefs) {
    setNotifPrefs((p) => ({ ...p, [key]: !p[key] }));
  }

  const notifRows: { key: keyof typeof notifPrefs; label: string; sub: string }[] = [
    { key: "newHomeRegistrations", label: "New home registrations",   sub: "Notified when a new residential home is added to the platform" },
    { key: "staffAccountCreated",  label: "Staff account created",    sub: "Notified when a new staff account is registered across any home" },
    { key: "subscriptionChanges",  label: "Subscription changes",     sub: "Notified on subscription activations, deactivations, or renewals" },
    { key: "systemAlerts",         label: "System & security alerts", sub: "Platform-wide alerts including failed logins, anomalies, and maintenance" },
  ];

  // ── Section 4: System ────────────────────────────────────────────────────
  const [timezone, setTimezone]   = useState("Europe/London");
  const [dateFormat, setDateFormat] = useState("DD/MM/YYYY");

  const timezones = [
    "Europe/London", "Europe/Paris", "Europe/Berlin", "Europe/Amsterdam",
    "America/New_York", "America/Chicago", "America/Los_Angeles",
    "Asia/Singapore", "Australia/Sydney",
  ];
  const dateFormats = ["DD/MM/YYYY", "MM/DD/YYYY", "YYYY-MM-DD", "D MMM YYYY"];

  function formatDatePreview(fmt: string) {
    if (fmt === "DD/MM/YYYY") return "19/03/2026";
    if (fmt === "MM/DD/YYYY") return "03/19/2026";
    if (fmt === "YYYY-MM-DD") return "2026-03-19";
    return "19 Mar 2026";
  }

  const selectClass = "w-full px-3 py-2 text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 appearance-none pr-8";

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Session warning banner */}
      {showWarning && (
        <div className="fixed top-0 inset-x-0 z-[100] flex items-center justify-between px-6 py-3 bg-amber-400 text-amber-900 text-sm font-medium">
          <span>Your session will expire in {warningMinsLeft} minute{warningMinsLeft !== 1 ? "s" : ""}.</span>
          <button
            onClick={() => {
              lastActivityRef.current = Date.now();
              warningActiveRef.current = false;
              setShowWarning(false);
            }}
            className="px-3 py-1 rounded-md bg-amber-900/10 hover:bg-amber-900/20 transition-colors text-xs font-semibold"
          >
            Extend session
          </button>
        </div>
      )}

      <div className={`flex-1 flex flex-col ${showWarning ? "mt-[52px]" : ""}`}>
        <header className="flex items-center justify-between px-8 py-5 bg-white border-b border-slate-200">
          <div>
            <h1 className="text-xl font-semibold text-slate-800">Settings</h1>
            <p className="text-sm text-slate-500 mt-0.5">Manage your account and system preferences</p>
          </div>
        </header>

        <main className="flex-1 p-8 max-w-3xl">

          {/* ── Section 1: Personal Details ─────────────────────────────── */}
          <SectionHeading number={1} title="Personal Details" />
          <div className="space-y-4">
            <div>
              <Label>Full Name</Label>
              <input
                type="text" value={displayName}
                onChange={(e) => setName(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <Label>Email Address</Label>
              <input
                type="email" value={displayEmail}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass}
              />
              <p className="text-xs text-slate-400 mt-1.5">Used for account login, notifications, and 2FA verification codes.</p>
            </div>
            <div>
              <Label>Role</Label>
              <div className={readOnlyClass}>{user ? roleLabel(user.role) : "—"}</div>
            </div>
            {profileError && <p className="text-xs text-red-500">{profileError}</p>}
            <div className="flex justify-end pt-1">
              <button
                onClick={handleSaveProfile}
                disabled={!user}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {profileSaved ? "Saved ✓" : "Save Changes"}
              </button>
            </div>
          </div>

          <Divider />

          {/* ── Section 2: Security ─────────────────────────────────────── */}
          <SectionHeading number={2} title="Security" />

          {/* Change password */}
          <div className="space-y-4">
            <div>
              <Label>Current Password</Label>
              <input
                type="password" value={current}
                onChange={(e) => { setCurrent(e.target.value); setPwError(""); }}
                className={inputClass} placeholder="Enter current password"
              />
            </div>
            <div>
              <Label>New Password</Label>
              <input
                type="password" value={next}
                onChange={(e) => { setNext(e.target.value); setPwError(""); }}
                className={inputClass} placeholder="At least 8 characters"
              />
            </div>
            <div>
              <Label>Confirm New Password</Label>
              <input
                type="password" value={confirm}
                onChange={(e) => { setConfirm(e.target.value); setPwError(""); }}
                className={inputClass} placeholder="Repeat new password"
              />
            </div>
            {pwError && <p className="text-xs text-red-500">{pwError}</p>}
            <div className="flex justify-end">
              <button
                onClick={handlePasswordSave}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
              >
                {pwSaved ? "Saved ✓" : "Save Password"}
              </button>
            </div>
          </div>

          {/* 2FA status */}
          <div className="mt-6 p-4 bg-slate-50 border border-slate-200 rounded-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-sm font-semibold text-slate-700">Two-Factor Authentication</p>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Active
                  </span>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Two-factor authentication is mandatory on your account. A verification code is sent to{" "}
                  <span className="font-medium text-slate-600">{maskEmail(displayEmail)}</span>{" "}
                  each time you sign in.
                </p>
              </div>
              <button
                onClick={handleSendTestCode}
                disabled={testCodeCooldown > 0}
                className="flex-shrink-0 px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-60 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
              >
                {testCodeCooldown > 0 ? `Resend in ${testCodeCooldown}s` : "Send test code"}
              </button>
            </div>
          </div>

          {/* Active Sessions */}
          <div className="mt-6">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Sessions</p>
              {!sessionsSignedOut && sessions.filter((s) => !s.isCurrent).length > 0 && (
                <button
                  onClick={signOutOtherSessions}
                  className="text-xs font-medium text-red-500 hover:text-red-600 transition-colors"
                >
                  Sign out all other sessions
                </button>
              )}
            </div>
            <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
              {sessions.map((session) => (
                <div key={session.id} className="flex items-center gap-4 px-4 py-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                    <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      {session.device.includes("iPhone") ? (
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      )}
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-700">{session.device}</p>
                    <p className="text-xs text-slate-400">{session.location} · {session.lastActive}</p>
                  </div>
                  {session.isCurrent && (
                    <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full flex-shrink-0">
                      This device
                    </span>
                  )}
                </div>
              ))}
              {sessionsSignedOut && sessions.length === 1 && (
                <div className="px-4 py-3 text-xs text-slate-400 text-center">
                  All other sessions have been signed out.
                </div>
              )}
            </div>
          </div>

          <Divider />

          {/* ── Section 3: Notifications ─────────────────────────────────── */}
          <SectionHeading number={3} title="Notifications" />
          <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
            {notifRows.map(({ key, label, sub }) => (
              <div key={key} className="flex items-center justify-between gap-4 px-4 py-4">
                <div>
                  <p className="text-sm font-medium text-slate-700">{label}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{sub}</p>
                </div>
                <button
                  onClick={() => toggleNotif(key)}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors ${notifPrefs[key] ? "bg-blue-600" : "bg-slate-200"}`}
                >
                  <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${notifPrefs[key] ? "translate-x-5" : "translate-x-0.5"}`} />
                </button>
              </div>
            ))}
          </div>

          <Divider />

          {/* ── Section 4: System ────────────────────────────────────────── */}
          <SectionHeading number={4} title="System" />
          <div className="space-y-4">
            <div>
              <Label>Default Timezone</Label>
              <div className="relative">
                <select value={timezone} onChange={(e) => setTimezone(e.target.value)} className={selectClass}>
                  {timezones.map((tz) => <option key={tz} value={tz}>{tz}</option>)}
                </select>
                <svg className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
            <div>
              <Label>Date Format</Label>
              <div className="relative">
                <select value={dateFormat} onChange={(e) => setDateFormat(e.target.value)} className={selectClass}>
                  {dateFormats.map((f) => <option key={f} value={f}>{f}</option>)}
                </select>
                <svg className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
              <p className="text-xs text-slate-400 mt-1.5">Preview: {formatDatePreview(dateFormat)}</p>
            </div>
            <div className="flex justify-end pt-1">
              <button className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors">
                Save System Settings
              </button>
            </div>
          </div>

        </main>
      </div>
    </>
  );
}
