"use client";

import { useState, useEffect } from "react";
import type { DbAlert, DbChild } from "../../lib/supabase/queries";
import type { Severity, Alert, AlertStatus, TamperEvent } from "../../lib/types";
import SeverityBadge from "../../components/SeverityBadge";
import { AlertReportModal } from "../../components/AlertReportModal";
import { TamperReportModal } from "../../components/TamperReportModal";
import { useAuth } from "../../components/AuthProvider";
import { createSupabaseBrowserClient } from "../../lib/supabase";

// ─── Data mapping ─────────────────────────────────────────────────────────────

const PACKAGE_NAMES: Record<string, string> = {
  "com.google.android.youtube":  "YouTube",
  "com.zhiliaoapp.musically":    "TikTok",
  "com.instagram.android":       "Instagram",
  "com.snapchat.android":        "Snapchat",
  "com.facebook.katana":         "Facebook",
  "com.twitter.android":         "X (Twitter)",
  "com.whatsapp":                "WhatsApp",
  "org.telegram.messenger":      "Telegram",
  "com.discord":                 "Discord",
  "com.reddit.frontpage":        "Reddit",
  "com.roblox.client":           "Roblox",
  "com.mojang.minecraftpe":      "Minecraft",
};

function formatAlertDescription(alertType: string | null, raw: string | null): string {
  const desc = raw ?? "";
  if (alertType === "app_blocked") {
    const pkg = desc.replace(/^Blocked app launch attempt:\s*/i, "").trim();
    const friendly = PACKAGE_NAMES[pkg] ?? pkg;
    return `App blocked: ${friendly}`;
  }
  if (alertType === "blocked_website") {
    const domain = desc.replace(/^Blocked website attempt:\s*/i, "").trim();
    return `Site blocked: ${domain}`;
  }
  return desc;
}

function mapDbAlertToAlert(a: DbAlert, index: number): Alert {
  const description = formatAlertDescription(a.alert_type, a.description);
  return {
    id: index,
    homeId: 0,
    childInitials: a.children?.initials ?? "",
    childName: a.children?.initials ?? "",
    childAge: a.children?.age ?? 0,
    device: a.devices?.device_name ?? "",
    alertType: a.alert_type ?? "",
    severity: (a.severity ?? "low") as Severity,
    timestamp: a.created_at,
    status: "unread" as AlertStatus,
    description,
    triggerContent: description,
    location: "",
    app: a.app_name ?? undefined,
    hasScreenshot: a.has_screenshot ?? false,
  };
}

function mapDbAlertToTamperEvent(a: DbAlert, index: number): TamperEvent {
  const loc = a.last_location as { lat?: number; lng?: number; area?: string } | null;
  return {
    id: index,
    homeId: 0,
    childInitials: a.children?.initials ?? "",
    childName: a.children?.initials ?? "",
    device: a.devices?.device_name ?? "",
    eventType: (a.alert_type ?? "Device Tamper") as TamperEvent["eventType"],
    timestamp: a.created_at,
    location: { lat: loc?.lat ?? 0, lng: loc?.lng ?? 0, area: loc?.area ?? "Unknown" },
    severity: "critical" as const,
  };
}

// ─── UI config ────────────────────────────────────────────────────────────────

const ALERT_TYPES = [
  "Inappropriate Content",
  "Self-Harm Keywords",
  "Unknown Contact",
  "Late Night Usage",
  "Screen Time Exceeded",
  "App Install Attempt",
  "Location Deviation",
  "Social Media Flagged",
  "Security",
  "Grooming Language Detected",
  "Explicit Content Visible",
  "Drug/Alcohol References",
  "Self-Harm Language",
  "Sextortion Risk Keywords",
  "Nudity Detected",
  "Suspicious Contact Pattern",
] as const;

type SeverityFilter = Severity | "tamper" | "";
type DateRange = "today" | "7days" | "30days" | "all";

const DATE_RANGE_OPTIONS: { value: DateRange; label: string }[] = [
  { value: "all",    label: "All time" },
  { value: "today",  label: "Today" },
  { value: "7days",  label: "Last 7 days" },
  { value: "30days", label: "Last 30 days" },
];

type DisplayRow =
  | { kind: "alert";  data: Alert;       dbId: string }
  | { kind: "tamper"; data: TamperEvent; dbId: string };

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTimestamp(iso: string) {
  return new Date(iso).toLocaleString("en-GB", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

const severityRowAccent: Record<Severity, string> = {
  critical: "border-l-red-500",
  high:     "border-l-orange-400",
  medium:   "border-l-yellow-400",
  low:      "border-l-green-400",
};

function isWithinRange(iso: string, range: DateRange): boolean {
  if (range === "all") return true;
  const now = new Date();
  const date = new Date(iso);
  const msPerDay = 24 * 60 * 60 * 1000;
  if (range === "today") return now.toDateString() === date.toDateString();
  const days = range === "7days" ? 7 : 30;
  return now.getTime() - date.getTime() <= days * msPerDay;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function FilterSelect({
  value, onChange, options, active,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  active: boolean;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`appearance-none pl-3 pr-8 py-2 text-sm rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 cursor-pointer ${
          active
            ? "border-blue-400 bg-blue-50 text-blue-700 font-medium"
            : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
        }`}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <svg
        className={`pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 ${active ? "text-blue-500" : "text-slate-400"}`}
        fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
      </svg>
    </div>
  );
}

function CameraIconPaths() {
  return (
    <>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
    </>
  );
}

function ScreenshotPreviewModal({ alert, onClose }: { alert: Alert; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-semibold text-slate-800">Screenshot Preview</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {alert.childInitials} · {alert.app ?? alert.device} · {formatTimestamp(alert.timestamp)}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div className="w-full h-64 bg-slate-100 rounded-xl border border-slate-200 flex flex-col items-center justify-center gap-3">
            <svg className="w-12 h-12 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <CameraIconPaths />
            </svg>
            <p className="text-xs text-slate-400">Screenshot placeholder</p>
          </div>
          <div className="flex items-start gap-2 px-4 py-3 bg-amber-50 border border-amber-100 rounded-xl">
            <svg className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-xs text-amber-700">Screenshot captured automatically when flagged content was detected</p>
          </div>
        </div>

        <div className="flex justify-end px-6 py-4 border-t border-slate-100">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function AlertDetailModal({
  alert, onClose, onDownload, onViewScreenshot,
}: {
  alert: Alert;
  onClose: () => void;
  onDownload: () => void;
  onViewScreenshot: () => void;
}) {
  const [notes, setNotes] = useState("");

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
          <h2 className="text-base font-semibold text-slate-800">Alert Detail</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          <div className="flex items-center gap-3">
            <div className={`flex items-center justify-center w-10 h-10 rounded-full text-sm font-bold flex-shrink-0 ${
              alert.severity === "critical" ? "bg-red-100 text-red-700" :
              alert.severity === "high"     ? "bg-orange-100 text-orange-700" :
                                              "bg-slate-100 text-slate-600"
            }`}>
              {alert.childInitials.replace(/\./g, "").slice(0, 2)}
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800">{alert.childName} — Age {alert.childAge}</p>
              <p className="text-xs text-slate-400 mt-0.5">{alert.device}</p>
            </div>
          </div>

          <div className="bg-slate-50 rounded-xl border border-slate-100 divide-y divide-slate-100">
            <div className="flex items-center justify-between px-4 py-2.5">
              <span className="text-xs text-slate-500">Alert Type</span>
              <div className="flex items-center gap-2">
                <SeverityBadge severity={alert.severity} />
                <span className="text-xs text-slate-700">{alert.alertType}</span>
              </div>
            </div>
            <div className="flex items-center justify-between px-4 py-2.5">
              <span className="text-xs text-slate-500">Timestamp</span>
              <span className="text-xs text-slate-700">{formatTimestamp(alert.timestamp)}</span>
            </div>
            <div className="flex items-start justify-between px-4 py-2.5 gap-4">
              <span className="text-xs text-slate-500 flex-shrink-0">Location</span>
              <span className="text-xs text-slate-700 text-right">{alert.location}</span>
            </div>
            {alert.app && (
              <div className="flex items-center justify-between px-4 py-2.5">
                <span className="text-xs text-slate-500">App</span>
                <span className="text-xs font-medium text-slate-700">{alert.app}</span>
              </div>
            )}
          </div>

          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Description</p>
            <p className="text-sm text-slate-700 leading-relaxed">{alert.description}</p>
          </div>

          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Trigger Details</p>
            <div className="bg-slate-50 rounded-lg border border-slate-100 px-4 py-3">
              <p className="text-xs text-slate-600 leading-relaxed">{alert.triggerContent}</p>
            </div>
          </div>

          {alert.hasScreenshot && (
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Screenshot</p>
              <div className="flex items-center gap-3">
                <button
                  onClick={onViewScreenshot}
                  className="w-16 h-12 bg-slate-100 rounded-lg border border-slate-200 flex items-center justify-center hover:bg-slate-200 transition-colors flex-shrink-0"
                  title="View full screenshot"
                >
                  <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <CameraIconPaths />
                  </svg>
                </button>
                <div>
                  <p className="text-xs font-medium text-slate-700">Screenshot attached</p>
                  <button
                    onClick={onViewScreenshot}
                    className="text-xs text-blue-600 hover:text-blue-700 mt-0.5 transition-colors"
                  >
                    View Full Screenshot →
                  </button>
                </div>
              </div>
            </div>
          )}

          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Staff Notes</p>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add your observations or actions taken..."
              rows={3}
              className="w-full px-3 py-2 text-sm text-slate-700 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 resize-none placeholder-slate-400"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Close
          </button>
          <button
            onClick={onDownload}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Download Alert
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main client component ────────────────────────────────────────────────────

interface Props {
  dbAlerts: DbAlert[];
  dbChildren: DbChild[];
}

export default function AlertsClient({ dbAlerts: initialDbAlerts, dbChildren }: Props) {
  const { user, selectedHomeId } = useAuth();
  const [reportAlert,    setReportAlert]    = useState<Alert | null>(null);
  const [reportTamper,   setReportTamper]   = useState<TamperEvent | null>(null);
  const [detailAlert,    setDetailAlert]    = useState<Alert | null>(null);
  const [screenshotAlert, setScreenshotAlert] = useState<Alert | null>(null);

  const [search,    setSearch]    = useState("");
  const [severity,  setSeverity]  = useState<SeverityFilter>("");
  const [alertType, setAlertType] = useState("");
  const [child,     setChild]     = useState("");
  const [dateRange, setDateRange] = useState<DateRange>("all");

  // Live alerts list — seeded from server, updated via Realtime
  const [dbAlerts, setDbAlerts] = useState<DbAlert[]>(initialDbAlerts);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const c = params.get("child");
    if (c) setChild(c);
  }, []);

  // Realtime: prepend new alerts as they arrive
  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    const channel = supabase
      .channel("alerts-page")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "alerts" },
        (payload) => {
          const newAlert = payload.new as DbAlert;
          setDbAlerts((prev) => [newAlert, ...prev]);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const homeId = selectedHomeId ?? user?.homeIds?.[0] ?? null;

  // Filter DB records by the current home
  const homeDbAlerts   = dbAlerts.filter((a) => homeId !== null && a.home_id === homeId);
  const homeDbChildren = dbChildren.filter((c) => homeId !== null && c.home_id === homeId);

  // Split into regular alerts and tamper events
  const regularDbAlerts = homeDbAlerts.filter((a) => a.category !== "tamper");
  const tamperDbAlerts  = homeDbAlerts.filter((a) => a.category === "tamper");

  // Map to UI types
  const mappedAlerts  = regularDbAlerts.map(mapDbAlertToAlert);
  const mappedTampers = tamperDbAlerts.map(mapDbAlertToTamperEvent);

  // Build unified display rows, sorted newest first
  const allRows: DisplayRow[] = [
    ...regularDbAlerts.map((a, i): DisplayRow => ({
      kind: "alert",
      data: mappedAlerts[i],
      dbId: a.id,
    })),
    ...tamperDbAlerts.map((a, i): DisplayRow => ({
      kind: "tamper",
      data: mappedTampers[i],
      dbId: a.id,
    })),
  ].sort((a, b) =>
    new Date(b.data.timestamp).getTime() - new Date(a.data.timestamp).getTime()
  );

  const totalCount = allRows.length;

  const activeFilterCount =
    [severity, alertType, child].filter(Boolean).length +
    (dateRange !== "all" ? 1 : 0);

  function clearAll() {
    setSearch("");
    setSeverity("");
    setAlertType("");
    setChild("");
    setDateRange("all");
  }

  const filtered = allRows.filter((row) => {
    const ts       = row.data.timestamp;
    const initials = row.data.childInitials;
    const name     = row.data.childName;
    const rowType  = row.kind === "tamper" ? "Security" : (row.data as Alert).alertType;
    const rowSev   = row.kind === "tamper" ? "tamper"   : (row.data as Alert).severity;

    if (severity  && rowSev  !== severity)  return false;
    if (alertType && rowType !== alertType) return false;
    if (child     && initials !== child)    return false;
    if (!isWithinRange(ts, dateRange))      return false;
    if (search) {
      const q = search.toLowerCase();
      if (!name.toLowerCase().includes(q) && !initials.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  // Child filter options built from real DB children
  const childOptions = homeDbChildren.map((c) => ({
    value: c.initials,
    label: c.initials.replace(/\./g, ""),
  }));

  const homeName =
    user?.homeNames && user.homeIds && homeId
      ? (user.homeNames[user.homeIds.indexOf(homeId)] ?? user.homeNames[0] ?? "Residential Home")
      : "Residential Home";

  return (
    <div className="flex-1 flex flex-col">
      {/* Top bar */}
      <header className="flex items-center justify-between px-8 py-5 bg-white border-b border-slate-200">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">Alerts</h1>
          <p className="text-sm text-slate-500 mt-0.5">{totalCount} alerts logged</p>
        </div>
      </header>

      <main className="flex-1 p-8">
        {/* Filter bar */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-5 py-4 mb-6">
          <div className="flex items-center gap-3 flex-wrap">

            {/* Search */}
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name or initials..."
                className="pl-9 pr-4 py-2 text-sm text-slate-700 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 placeholder-slate-400 w-52"
              />
            </div>

            <div className="w-px h-6 bg-slate-200 hidden sm:block" />

            {/* Severity */}
            <FilterSelect
              value={severity}
              onChange={(v) => setSeverity(v as SeverityFilter)}
              active={!!severity}
              options={[
                { value: "",         label: "All Severities" },
                { value: "tamper",   label: "Tamper" },
                { value: "critical", label: "Critical" },
                { value: "high",     label: "High" },
                { value: "medium",   label: "Medium" },
                { value: "low",      label: "Low" },
              ]}
            />

            {/* Alert type */}
            <FilterSelect
              value={alertType}
              onChange={setAlertType}
              active={!!alertType}
              options={[
                { value: "", label: "All Types" },
                ...ALERT_TYPES.map((t) => ({ value: t, label: t })),
              ]}
            />

            {/* Child — populated from real DB children */}
            <FilterSelect
              value={child}
              onChange={setChild}
              active={!!child}
              options={[
                { value: "", label: "All Children" },
                ...childOptions.map((c) => ({ value: c.value, label: c.label })),
              ]}
            />

            {/* Date range */}
            <FilterSelect
              value={dateRange}
              onChange={(v) => setDateRange(v as DateRange)}
              active={dateRange !== "all"}
              options={DATE_RANGE_OPTIONS}
            />

            <div className="flex-1" />

            <div className="flex items-center gap-2">
              {activeFilterCount > 0 && (
                <span className="text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-100 px-2.5 py-1 rounded-full">
                  Filters ({activeFilterCount})
                </span>
              )}
              {(activeFilterCount > 0 || search) && (
                <button
                  onClick={clearAll}
                  className="flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700 transition-colors px-2 py-1 rounded-lg hover:bg-slate-100"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Clear all
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Alerts table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="grid grid-cols-[2fr_2.5fr_1.6fr_1.2fr_1.6fr_auto] gap-4 px-6 py-3 bg-slate-50 border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wider">
            <span>Child</span>
            <span>Alert Type</span>
            <span>Device</span>
            <span className="text-center">Severity</span>
            <span className="text-center">Timestamp</span>
            <span>Download</span>
          </div>

          <div className="divide-y divide-slate-50">
            {filtered.length === 0 && (
              <p className="text-sm text-slate-400 text-center py-12">No alerts match your filters.</p>
            )}
            {filtered.map((row) => {
              if (row.kind === "tamper") {
                const t = row.data;
                return (
                  <div
                    key={`tamper-${row.dbId}`}
                    className="grid grid-cols-[2fr_2.5fr_1.6fr_1.2fr_1.6fr_auto] gap-4 px-6 py-4 items-center border-l-[3px] border-l-red-500 bg-red-50/40 hover:bg-red-50/70 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-red-100 flex-shrink-0">
                        <svg className="w-4 h-4 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">{t.childName}</p>
                        <p className="text-xs text-slate-400 truncate">{t.childInitials}</p>
                      </div>
                    </div>

                    <div>
                      <p className="text-sm font-medium text-slate-700">{t.eventType}</p>
                      <p className="text-xs text-slate-400 mt-0.5">Last known location: {t.location.area}</p>
                    </div>

                    <div className="min-w-0">
                      <p className="text-sm text-slate-600 truncate">{t.device}</p>
                    </div>

                    <div className="flex justify-center">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-full bg-red-600 text-white">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                        </svg>
                        Tamper
                      </span>
                    </div>

                    <div className="text-center">
                      <p className="text-sm text-slate-600">{formatTimestamp(t.timestamp)}</p>
                    </div>

                    <div>
                      <button
                        onClick={() => setReportTamper(t)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-100 rounded-lg hover:bg-blue-100 transition-colors whitespace-nowrap"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Download Alert
                      </button>
                    </div>
                  </div>
                );
              }

              const alert = row.data;
              return (
                <div
                  key={`alert-${row.dbId}`}
                  onClick={() => setDetailAlert(alert)}
                  className={`cursor-pointer grid grid-cols-[2fr_2.5fr_1.6fr_1.2fr_1.6fr_auto] gap-4 px-6 py-4 items-center border-l-[3px] ${severityRowAccent[alert.severity]} hover:bg-slate-50/70 transition-colors`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold flex-shrink-0 ${
                      alert.severity === "critical" ? "bg-red-100 text-red-700" :
                      alert.severity === "high"     ? "bg-orange-100 text-orange-700" :
                                                      "bg-slate-100 text-slate-600"
                    }`}>
                      {alert.childInitials.replace(/\./g, "").slice(0, 2)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{alert.childName}</p>
                      <p className="text-xs text-slate-400 truncate">Age {alert.childAge}</p>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-medium text-slate-700">{alert.alertType}</p>
                      {alert.hasScreenshot && (
                        <span title="Screenshot included in download" className="flex-shrink-0 text-slate-400">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                            <CameraIconPaths />
                          </svg>
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">
                      {alert.hasScreenshot ? "Screenshot captured at time of detection" : alert.description}
                    </p>
                  </div>

                  <div className="min-w-0">
                    <p className="text-sm text-slate-600 truncate">{alert.device}</p>
                    {alert.app && (
                      <p className="text-xs text-slate-400 mt-0.5 truncate">{alert.app}</p>
                    )}
                  </div>

                  <div className="flex justify-center">
                    <SeverityBadge severity={alert.severity} />
                  </div>

                  <div className="text-center">
                    <p className="text-sm text-slate-600">{formatTimestamp(alert.timestamp)}</p>
                  </div>

                  <div>
                    <button
                      onClick={(e) => { e.stopPropagation(); setReportAlert(alert); }}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-100 rounded-lg hover:bg-blue-100 transition-colors whitespace-nowrap"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Download Alert
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Results count + pagination */}
        <div className="flex items-center justify-between mt-5">
          <p className="text-sm text-slate-500">
            Showing{" "}
            <span className="font-medium text-slate-700">{filtered.length}</span>
            {" "}of{" "}
            <span className="font-medium text-slate-700">{totalCount}</span>
            {" "}alerts
          </p>
          <div className="flex items-center gap-1">
            {["←", "1", "2", "3", "→"].map((p) => (
              <button
                key={p}
                className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm transition-colors ${
                  p === "1" ? "bg-blue-600 text-white font-medium" : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      </main>

      {/* Alert detail modal */}
      {detailAlert && (
        <AlertDetailModal
          alert={detailAlert}
          onClose={() => setDetailAlert(null)}
          onDownload={() => { setReportAlert(detailAlert); setDetailAlert(null); }}
          onViewScreenshot={() => setScreenshotAlert(detailAlert)}
        />
      )}

      {screenshotAlert && (
        <ScreenshotPreviewModal
          alert={screenshotAlert}
          onClose={() => setScreenshotAlert(null)}
        />
      )}

      {reportAlert && (
        <AlertReportModal
          alert={reportAlert}
          homeName={homeName}
          onClose={() => setReportAlert(null)}
        />
      )}

      {reportTamper && (
        <TamperReportModal
          event={reportTamper}
          homeName={homeName}
          onClose={() => setReportTamper(null)}
        />
      )}
    </div>
  );
}
