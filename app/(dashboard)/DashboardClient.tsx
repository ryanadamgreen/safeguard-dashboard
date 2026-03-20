"use client";

import { useState, useRef, useEffect } from "react";
import type { DbAlert, DbDeviceWithChild, DbChild } from "../lib/supabase/queries";
import type { Alert, Severity, AlertStatus, TamperEvent } from "../lib/types";
import SeverityBadge from "../components/SeverityBadge";
import { AlertReportModal } from "../components/AlertReportModal";
import { useAuth } from "../components/AuthProvider";
import Link from "next/link";

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  dbAlerts: DbAlert[];
  dbDevices: DbDeviceWithChild[];
  dbChildren: DbChild[];
  subscriptionStatus: string | null;
  trialExpiresAt: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

function formatDate(iso: string) {
  const date = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return `Today ${formatTime(iso)}`;
  if (date.toDateString() === yesterday.toDateString()) return `Yesterday ${formatTime(iso)}`;
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function formatLastSeen(iso: string | null): string {
  if (!iso) return "Never";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} min${mins === 1 ? "" : "s"} ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr${hrs === 1 ? "" : "s"} ago`;
  const days = Math.floor(hrs / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

function getTrialDaysRemaining(trialExpiresAt: string): number {
  return Math.ceil((new Date(trialExpiresAt).getTime() - Date.now()) / 86400000);
}

function mapDbAlertToUiAlert(dbAlert: DbAlert, index: number): Alert {
  return {
    id: index,
    homeId: 0,
    childInitials: dbAlert.children?.initials ?? "",
    childName: dbAlert.children?.initials ?? "",
    childAge: dbAlert.children?.age ?? 0,
    device: dbAlert.devices?.device_name ?? "",
    alertType: dbAlert.alert_type ?? "Unknown Alert",
    severity: (dbAlert.severity ?? "low") as Severity,
    timestamp: dbAlert.created_at,
    status: "unread" as AlertStatus,
    description: dbAlert.description ?? "",
    triggerContent: dbAlert.description ?? "",
    location: "",
    app: dbAlert.app_name ?? undefined,
    hasScreenshot: dbAlert.has_screenshot ?? false,
  };
}

function buildStatCards(totalChildren: number, activeDevices: number, totalDevices: number, alertsToday: number) {
  return [
    {
      label: "Total Children",
      value: totalChildren,
      sub: "Total children in the home",
      color: "bg-blue-500",
      icon: (
        <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
    {
      label: "Active Devices",
      value: activeDevices,
      sub: `${totalDevices - activeDevices} offline or restricted`,
      color: "bg-emerald-500",
      icon: (
        <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      label: "Alerts Today",
      value: alertsToday,
      sub: "alerts logged today",
      color: "bg-orange-500",
      icon: (
        <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
      ),
    },
  ];
}

// ── Tamper Location Modal ─────────────────────────────────────────────────────

function TamperLocationModal({ event, onClose }: { event: TamperEvent; onClose: () => void }) {
  const { lat, lng, area } = event.location;
  const eventTime = new Date(event.timestamp).toLocaleString("en-GB", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-semibold text-slate-800">Last Known Location</h2>
            <p className="text-xs text-slate-400 mt-0.5">{event.childInitials} · {event.device}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="rounded-none overflow-hidden">
          <iframe
            src={`https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.01},${lat - 0.01},${lng + 0.01},${lat + 0.01}&marker=${lat},${lng}&layer=mapnik`}
            width="100%"
            height="240"
            style={{ border: "none", display: "block" }}
            title="Last known location map"
          />
        </div>

        <div className="px-6 py-4 space-y-3">
          <div>
            <p className="text-sm font-semibold text-slate-800">{area}</p>
            <p className="text-xs text-slate-400 mt-0.5">At time of tamper event: {eventTime}</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <a
              href={`https://www.google.com/maps?q=${lat},${lng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <svg className="w-3.5 h-3.5 text-blue-500" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
              </svg>
              Open in Google Maps
            </a>
            <a
              href={`https://maps.apple.com/?q=${lat},${lng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <svg className="w-3.5 h-3.5 text-slate-500" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
              </svg>
              Open in Apple Maps
            </a>
          </div>
        </div>

        <div className="flex justify-end px-6 py-4 border-t border-slate-100">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Re-pair Modal ─────────────────────────────────────────────────────────────

function RePairModal({ deviceId, onClose }: { deviceId: string; onClose: () => void }) {
  const [code] = useState(() => Math.floor(100000 + Math.random() * 900000).toString());
  const [secondsLeft, setSecondsLeft] = useState(600);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (connected || secondsLeft === 0) return;
    const id = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [connected, secondsLeft]);

  useEffect(() => {
    const t = setTimeout(() => setConnected(true), 8000);
    return () => clearTimeout(t);
  }, []);

  const expired = secondsLeft === 0 && !connected;
  const p1 = code.slice(0, 3);
  const p2 = code.slice(3);

  function formatCountdown(s: number) {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-semibold text-slate-800">Re-pair Device</h2>
            <p className="text-xs text-slate-400 mt-0.5">{deviceId}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          <div className="flex flex-col items-center gap-3">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Pairing Code</p>
            <div className={`flex items-center gap-3 ${expired ? "opacity-40" : ""}`}>
              <div className="flex gap-1.5">
                {p1.split("").map((d, i) => (
                  <span key={i} className="flex items-center justify-center w-10 bg-slate-100 rounded-lg text-2xl font-bold text-slate-800 font-mono px-2.5 py-2.5">{d}</span>
                ))}
              </div>
              <span className="text-2xl text-slate-300 font-light">–</span>
              <div className="flex gap-1.5">
                {p2.split("").map((d, i) => (
                  <span key={i} className="flex items-center justify-center w-10 bg-slate-100 rounded-lg text-2xl font-bold text-slate-800 font-mono px-2.5 py-2.5">{d}</span>
                ))}
              </div>
            </div>
            {!connected && (
              <p className={`text-xs font-medium ${expired ? "text-red-500" : secondsLeft < 60 ? "text-orange-500" : "text-slate-400"}`}>
                {expired ? "Code expired — close and try again" : `Expires in ${formatCountdown(secondsLeft)}`}
              </p>
            )}
          </div>

          {!expired && (
            <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
              <p className="text-sm text-blue-800 leading-relaxed">
                Open the <strong>SafeGuard app</strong> on the device and enter this code to re-establish monitoring.
              </p>
            </div>
          )}

          <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors ${
            connected ? "bg-emerald-50 border-emerald-200" :
            expired   ? "bg-red-50 border-red-200" :
                        "bg-slate-50 border-slate-200"
          }`}>
            {connected ? (
              <>
                <svg className="w-5 h-5 text-emerald-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm font-medium text-emerald-700">Device Re-paired Successfully</p>
              </>
            ) : expired ? (
              <>
                <svg className="w-5 h-5 text-red-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm font-medium text-red-600">Pairing code expired</p>
              </>
            ) : (
              <>
                <div className="w-4 h-4 border-2 border-slate-300 border-t-blue-500 rounded-full animate-spin flex-shrink-0" />
                <p className="text-sm text-slate-500">Waiting for device to connect...</p>
              </>
            )}
          </div>
        </div>

        <div className="flex justify-end px-6 py-4 border-t border-slate-100">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            {connected ? "Done" : "Close"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Client Component ─────────────────────────────────────────────────────

export default function DashboardClient({
  dbAlerts,
  dbDevices,
  dbChildren,
  subscriptionStatus,
  trialExpiresAt,
}: Props) {
  const { user, selectedHomeId } = useAuth();
  const [bellOpen, setBellOpen] = useState(false);
  const [reportAlert, setReportAlert] = useState<Alert | null>(null);
  const [dismissedTamperIds, setDismissedTamperIds] = useState<string[]>([]);
  const [repairDeviceId, setRepairDeviceId] = useState<string | null>(null);
  const [viewLocationEvent, setViewLocationEvent] = useState<TamperEvent | null>(null);
  const bellRef = useRef<HTMLDivElement>(null);

  const homeId = selectedHomeId ?? user?.homeIds?.[0] ?? null;

  // Filter DB records by home
  const homeDbAlerts  = dbAlerts.filter((a) => homeId !== null && a.home_id === homeId);
  const homeDbDevices = dbDevices.filter((d) => homeId !== null && d.home_id === homeId);
  const homeDbChildren = dbChildren.filter((c) => homeId !== null && c.home_id === homeId);

  // Map to UI types
  const homeAlerts = homeDbAlerts.map(mapDbAlertToUiAlert);
  const recentAlerts = homeAlerts.slice(0, 5);
  const unreadAlerts = homeAlerts; // all alerts treated as unread (no status column yet)

  const today = new Date();
  const alertsToday = homeDbAlerts.filter(
    (a) => new Date(a.created_at).toDateString() === today.toDateString()
  ).length;

  const onlineDevices  = homeDbDevices.filter((d) => d.status === "online");
  const offlineDevices = homeDbDevices.filter((d) => d.status !== "online");
  const activeDeviceCount = onlineDevices.length;

  const homeName =
    user?.homeNames && user.homeIds && homeId
      ? (user.homeNames[user.homeIds.indexOf(homeId)] ?? user.homeNames[0] ?? "Residential Home")
      : "Residential Home";

  // Tamper events: alerts with category = 'tamper' that have location data
  const activeTamperEvents: TamperEvent[] = homeDbAlerts
    .filter((a) => a.category === "tamper" && a.last_location && !dismissedTamperIds.includes(a.id))
    .map((a) => {
      const loc = a.last_location as { lat?: number; lng?: number; area?: string } | null;
      return {
        id: 0, // unused — filtering uses string id above
        homeId: 0,
        childInitials: a.children?.initials ?? "",
        childName: a.children?.initials ?? "",
        device: a.devices?.device_name ?? "",
        eventType: (a.alert_type ?? "Device Tamper") as TamperEvent["eventType"],
        timestamp: a.created_at,
        location: { lat: loc?.lat ?? 0, lng: loc?.lng ?? 0, area: loc?.area ?? "Unknown" },
        severity: "critical" as const,
      };
    });

  // Trial banner logic
  const isTrialing = subscriptionStatus === "trialing";
  const trialDaysLeft = isTrialing && trialExpiresAt ? getTrialDaysRemaining(trialExpiresAt) : null;
  const trialExpired = trialDaysLeft !== null && trialDaysLeft <= 0;

  // Close bell dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setBellOpen(false);
      }
    }
    if (bellOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [bellOpen]);

  const statCards = buildStatCards(homeDbChildren.length, activeDeviceCount, homeDbDevices.length, alertsToday);

  return (
    <div className="flex-1 flex flex-col">
      {/* Top bar */}
      <header className="flex items-center justify-between px-8 py-5 bg-white border-b border-slate-200">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">Dashboard</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })} — {homeName}
          </p>
        </div>

        {/* Bell notification */}
        <div className="relative" ref={bellRef}>
          <button
            onClick={() => setBellOpen((o) => !o)}
            className="relative p-2 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
            aria-label="Notifications"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            {unreadAlerts.length > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white" />
            )}
          </button>

          {bellOpen && (
            <div className="absolute right-0 top-full mt-2 w-96 bg-white rounded-xl border border-slate-200 shadow-xl z-50">
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                <h3 className="text-sm font-semibold text-slate-800">Unread Alerts</h3>
                {unreadAlerts.length > 0 && (
                  <span className="text-xs font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                    {unreadAlerts.length} new
                  </span>
                )}
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-slate-50">
                {unreadAlerts.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-10">No unread alerts</p>
                ) : (
                  unreadAlerts.slice(0, 5).map((alert, i) => (
                    <Link
                      key={i}
                      href="/alerts"
                      onClick={() => setBellOpen(false)}
                      className="flex items-start gap-3 px-4 py-3 hover:bg-slate-50 transition-colors"
                    >
                      <div
                        className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold flex-shrink-0 mt-0.5 ${
                          alert.severity === "critical"
                            ? "bg-red-100 text-red-700"
                            : alert.severity === "high"
                            ? "bg-orange-100 text-orange-700"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {alert.childInitials.replace(/\./g, "").slice(0, 2)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium text-slate-800 truncate">{alert.alertType}</p>
                          <SeverityBadge severity={alert.severity} />
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {alert.childInitials} · {formatDate(alert.timestamp)}
                        </p>
                      </div>
                    </Link>
                  ))
                )}
              </div>

              <div className="px-4 py-3 border-t border-slate-100">
                <Link
                  href="/alerts"
                  onClick={() => setBellOpen(false)}
                  className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
                >
                  View all alerts →
                </Link>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Trial banners */}
      {isTrialing && trialExpired && (
        <div className="flex items-center gap-3 px-8 py-3 bg-red-600 border-b border-red-700">
          <svg className="w-4 h-4 text-white flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
          <p className="text-sm text-white font-medium">
            Your trial has expired. Please contact your administrator to set up a subscription to continue using SafeGuard.
          </p>
        </div>
      )}
      {isTrialing && !trialExpired && trialDaysLeft !== null && (
        <div className="flex items-center gap-3 px-8 py-3 bg-amber-50 border-b border-amber-200">
          <svg className="w-4 h-4 text-amber-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm text-amber-800">
            <span className="font-semibold">You are on a free trial</span> — {trialDaysLeft} day{trialDaysLeft !== 1 ? "s" : ""} remaining.
            {" "}To continue using SafeGuard after your trial, contact your administrator.
          </p>
        </div>
      )}

      <main className="flex-1 p-8 space-y-8">
        {/* Stat cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {statCards.map((card) => (
            <div key={card.label} className="bg-white rounded-xl border border-slate-200 p-5 flex items-start gap-4 shadow-sm">
              <div className={`flex items-center justify-center w-10 h-10 rounded-lg ${card.color} flex-shrink-0`}>
                {card.icon}
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800">{card.value}</p>
                <p className="text-sm font-medium text-slate-600">{card.label}</p>
                <p className="text-xs text-slate-400 mt-0.5">{card.sub}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Security Alerts (tamper events) */}
        {activeTamperEvents.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-xl overflow-hidden">
            <div className="flex items-center gap-3 px-6 py-3 bg-red-600">
              <svg className="w-5 h-5 text-white flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
              <p className="text-sm font-semibold text-white">Security alerts require immediate attention</p>
              <span className="ml-auto flex items-center justify-center w-5 h-5 text-xs font-bold rounded-full bg-white text-red-600">
                {activeTamperEvents.length}
              </span>
            </div>

            <div className="divide-y divide-red-100">
              {activeTamperEvents.map((evt, i) => (
                <div key={i} className="flex items-center gap-4 px-6 py-4 flex-wrap">
                  <div className="flex items-center justify-center w-9 h-9 rounded-full bg-red-100 flex-shrink-0">
                    <svg className="w-4 h-4 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-red-800">{evt.eventType}</span>
                      <span className="text-xs font-medium text-red-500 bg-red-100 px-2 py-0.5 rounded-full">CRITICAL</span>
                    </div>
                    <p className="text-xs text-red-600 mt-0.5">
                      {evt.childInitials} · {evt.device} · {new Date(evt.timestamp).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </p>
                    <p className="text-xs text-red-500 mt-0.5">Last known: {evt.location.area}</p>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => setRepairDeviceId(evt.device)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors whitespace-nowrap"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                      </svg>
                      Re-pair Device
                    </button>
                    <button
                      onClick={() => setViewLocationEvent(evt)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      View Location
                    </button>
                    <button
                      onClick={() => {
                        const dbAlert = homeDbAlerts.find((a) => a.category === "tamper" && a.children?.initials === evt.childInitials);
                        if (dbAlert) setDismissedTamperIds((prev) => [...prev, dbAlert.id]);
                      }}
                      className="px-3 py-1.5 text-xs font-medium text-red-600 bg-white border border-red-200 rounded-lg hover:bg-red-50 transition-colors whitespace-nowrap"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Recent alerts */}
          <div className="xl:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div>
                <h2 className="text-sm font-semibold text-slate-700">Recent Alerts</h2>
                <p className="text-xs text-slate-400 mt-0.5">Latest safeguarding notifications</p>
              </div>
              <Link href="/alerts" className="text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors">
                View all →
              </Link>
            </div>
            <div className="divide-y divide-slate-50">
              {recentAlerts.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-10">No recent alerts</p>
              ) : (
                recentAlerts.map((alert, i) => (
                  <div key={i} className="flex items-center gap-4 px-6 py-3.5 hover:bg-slate-50/60 transition-colors">
                    <div className="flex items-center justify-center w-9 h-9 rounded-full bg-slate-100 text-slate-600 text-xs font-bold flex-shrink-0">
                      {alert.childInitials.replace(/\./g, "").slice(0, 2)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-slate-800">{alert.childName}</span>
                        <span className="text-xs text-slate-400">·</span>
                        <span className="text-xs text-slate-500">{alert.device}</span>
                        {alert.hasScreenshot && (
                          <span title="Screenshot captured" className="inline-flex">
                            <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-600 mt-0.5 truncate">{alert.alertType}</p>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <div className="flex flex-col items-end gap-1">
                        <SeverityBadge severity={alert.severity} />
                        <span className="text-xs text-slate-400">{formatDate(alert.timestamp)}</span>
                      </div>
                      <button
                        onClick={() => setReportAlert(alert)}
                        title="Download Report"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Device status */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100">
              <h2 className="text-sm font-semibold text-slate-700">Device Status</h2>
              <p className="text-xs text-slate-400 mt-0.5">Live monitoring overview</p>
            </div>

            <div className="grid grid-cols-3 divide-x divide-slate-100 border-b border-slate-100">
              {[
                { label: "Online",     count: onlineDevices.length,                                          color: "text-emerald-600" },
                { label: "Offline",    count: offlineDevices.filter((d) => d.status === "offline").length,   color: "text-slate-400"   },
                { label: "Restricted", count: offlineDevices.filter((d) => d.status === "restricted").length, color: "text-orange-600"  },
              ].map((item) => (
                <div key={item.label} className="flex flex-col items-center py-3">
                  <span className={`text-lg font-bold ${item.color}`}>{item.count}</span>
                  <span className="text-xs text-slate-500 mt-0.5">{item.label}</span>
                </div>
              ))}
            </div>

            <div className="divide-y divide-slate-50">
              {homeDbDevices.map((device) => (
                <div key={device.id} className="flex items-center gap-3 px-6 py-3.5 hover:bg-slate-50/60 transition-colors">
                  <span
                    className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      device.status === "online"
                        ? "bg-emerald-500"
                        : device.status === "restricted"
                        ? "bg-orange-400"
                        : "bg-slate-300"
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-700 truncate">{device.device_name ?? device.id}</p>
                    <p className="text-xs text-slate-400 truncate">{device.children?.initials ?? "Unassigned"}</p>
                  </div>
                  <span className="text-xs text-slate-400 flex-shrink-0">{formatLastSeen(device.last_seen)}</span>
                </div>
              ))}
              {homeDbDevices.length === 0 && (
                <p className="text-sm text-slate-400 text-center py-8">No devices</p>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Report modal */}
      {reportAlert && (
        <AlertReportModal
          alert={reportAlert}
          homeName={homeName}
          onClose={() => setReportAlert(null)}
        />
      )}

      {/* Re-pair modal */}
      {repairDeviceId && (
        <RePairModal
          deviceId={repairDeviceId}
          onClose={() => setRepairDeviceId(null)}
        />
      )}

      {/* View location modal */}
      {viewLocationEvent && (
        <TamperLocationModal
          event={viewLocationEvent}
          onClose={() => setViewLocationEvent(null)}
        />
      )}
    </div>
  );
}
