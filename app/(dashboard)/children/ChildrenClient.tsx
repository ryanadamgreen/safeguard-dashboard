"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../../components/AuthProvider";
import type { DbChild, DbAlert, DbStaff, DbDevice } from "../../lib/supabase/queries";
import type { DeviceStatus } from "../../lib/types";
import { createDevice, checkPairingStatus, expirePairingCode, createChild, deleteDevice } from "../../lib/supabase/actions";

// ── UI Types ──────────────────────────────────────────────────────────────────

interface UiDevice {
  id: string;          // display name: device_name ?? first 8 chars of UUID
  dbId: string;        // actual UUID
  type: string;        // device_type ?? "Tablet"
  assignedTo: string;  // child initials
  status: DeviceStatus;
  lastSeen: string;    // formatted relative string
  battery: number;
  manufacturer: string;
  appVersion: string;
  location: { lat: number; lng: number; area: string; updatedAt: string };
}

interface UiChild {
  id: string;       // UUID
  initials: string;
  name: string;     // use initials since DB has no full name
  age: number;
  keyWorker: string;
  homeId: string;
  devices: UiDevice[];
}

interface UiTamperEvent {
  eventType: string;
  timestamp: string;
  location: { area: string };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

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

function mapDbDevice(d: DbDevice, childInitials: string): UiDevice {
  const loc = d.last_location as { lat?: number; lng?: number; area?: string } | null;
  return {
    id: d.device_name ?? d.id.slice(0, 8),
    dbId: d.id,
    type: d.device_type ?? "Tablet",
    assignedTo: childInitials,
    status: (d.status === "active" || d.status === "online" ? "online"
           : d.status === "restricted"                      ? "restricted"
           :                                                  "offline") as DeviceStatus,
    lastSeen: formatLastSeen(d.last_seen),
    battery: d.battery_level ?? 50,
    manufacturer: d.manufacturer ?? "Unknown",
    appVersion: d.app_version ?? "SafeGuard",
    location: {
      lat: loc?.lat ?? 0,
      lng: loc?.lng ?? 0,
      area: loc?.area ?? "Unknown",
      updatedAt: d.last_seen ?? new Date().toISOString(),
    },
  };
}

function mapDbChild(c: DbChild): UiChild {
  return {
    id: c.id,
    initials: c.initials,
    name: c.initials,
    age: c.age ?? 0,
    keyWorker: c.key_worker ?? "",
    homeId: c.home_id,
    devices: c.devices.map((d) => mapDbDevice(d, c.initials)),
  };
}

function formatCountdown(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

const deviceStatusConfig: Record<DeviceStatus, {
  dot: string; label: string; pillBg: string; labelColor: string;
}> = {
  online:     { dot: "bg-emerald-400", label: "Online",     pillBg: "bg-emerald-50 border-emerald-200", labelColor: "text-emerald-700" },
  offline:    { dot: "bg-slate-300",   label: "Offline",    pillBg: "bg-slate-50 border-slate-200",     labelColor: "text-slate-500"   },
  restricted: { dot: "bg-orange-400",  label: "Restricted", pillBg: "bg-orange-50 border-orange-200",   labelColor: "text-orange-700"  },
};

// Phone icon (narrower body)
const PhoneIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
  </svg>
);

// Tablet icon (wider body)
const TabletIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
  </svg>
);

function DeviceTypeIcon({ type, className }: { type: string; className?: string }) {
  return type.toLowerCase().includes("phone")
    ? <PhoneIcon className={className} />
    : <TabletIcon className={className} />;
}

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

// ── App block list ────────────────────────────────────────────────────────────

type AppCategory = "Social Media" | "Messaging" | "Dating" | "Gaming" | "Browser";

interface AppEntry {
  name: string;
  category: AppCategory;
  avatarBg: string;   // tailwind bg class
  avatarText: string; // tailwind text class (white or dark)
}

const APP_LIST: AppEntry[] = [
  // Social Media
  { name: "TikTok",      category: "Social Media", avatarBg: "bg-zinc-900",    avatarText: "text-white" },
  { name: "Instagram",   category: "Social Media", avatarBg: "bg-pink-500",    avatarText: "text-white" },
  { name: "Snapchat",    category: "Social Media", avatarBg: "bg-yellow-400",  avatarText: "text-zinc-900" },
  { name: "Facebook",    category: "Social Media", avatarBg: "bg-blue-600",    avatarText: "text-white" },
  { name: "Twitter/X",   category: "Social Media", avatarBg: "bg-slate-900",   avatarText: "text-white" },
  { name: "YouTube",     category: "Social Media", avatarBg: "bg-red-600",     avatarText: "text-white" },
  { name: "WhatsApp",    category: "Social Media", avatarBg: "bg-emerald-500", avatarText: "text-white" },
  { name: "Telegram",    category: "Social Media", avatarBg: "bg-sky-500",     avatarText: "text-white" },
  { name: "Discord",     category: "Social Media", avatarBg: "bg-indigo-500",  avatarText: "text-white" },
  { name: "BeReal",      category: "Social Media", avatarBg: "bg-zinc-800",    avatarText: "text-white" },
  { name: "Threads",     category: "Social Media", avatarBg: "bg-zinc-900",    avatarText: "text-white" },
  { name: "Pinterest",   category: "Social Media", avatarBg: "bg-red-600",     avatarText: "text-white" },
  { name: "Tumblr",      category: "Social Media", avatarBg: "bg-slate-700",   avatarText: "text-white" },
  { name: "Reddit",      category: "Social Media", avatarBg: "bg-orange-600",  avatarText: "text-white" },
  // Messaging
  { name: "Signal",      category: "Messaging",    avatarBg: "bg-blue-500",    avatarText: "text-white" },
  { name: "Viber",       category: "Messaging",    avatarBg: "bg-purple-500",  avatarText: "text-white" },
  { name: "Kik",         category: "Messaging",    avatarBg: "bg-emerald-600", avatarText: "text-white" },
  { name: "TextNow",     category: "Messaging",    avatarBg: "bg-blue-400",    avatarText: "text-white" },
  { name: "Skype",       category: "Messaging",    avatarBg: "bg-sky-600",     avatarText: "text-white" },
  // Dating
  { name: "Tinder",      category: "Dating",       avatarBg: "bg-red-500",     avatarText: "text-white" },
  { name: "Bumble",      category: "Dating",       avatarBg: "bg-amber-400",   avatarText: "text-zinc-900" },
  { name: "Grindr",      category: "Dating",       avatarBg: "bg-yellow-500",  avatarText: "text-zinc-900" },
  { name: "Omegle",      category: "Dating",       avatarBg: "bg-slate-600",   avatarText: "text-white" },
  { name: "Yubo",        category: "Dating",       avatarBg: "bg-blue-500",    avatarText: "text-white" },
  { name: "MeetMe",      category: "Dating",       avatarBg: "bg-pink-600",    avatarText: "text-white" },
  // Gaming
  { name: "Roblox",      category: "Gaming",       avatarBg: "bg-red-500",     avatarText: "text-white" },
  { name: "Fortnite",    category: "Gaming",       avatarBg: "bg-blue-700",    avatarText: "text-white" },
  { name: "PUBG",        category: "Gaming",       avatarBg: "bg-orange-600",  avatarText: "text-white" },
  { name: "COD Mobile",  category: "Gaming",       avatarBg: "bg-green-800",   avatarText: "text-white" },
  { name: "GTA",         category: "Gaming",       avatarBg: "bg-lime-600",    avatarText: "text-white" },
  // Browser
  { name: "Chrome",      category: "Browser",      avatarBg: "bg-blue-500",    avatarText: "text-white" },
  { name: "Firefox",     category: "Browser",      avatarBg: "bg-orange-500",  avatarText: "text-white" },
  { name: "Opera",       category: "Browser",      avatarBg: "bg-red-600",     avatarText: "text-white" },
  { name: "Brave",       category: "Browser",      avatarBg: "bg-orange-600",  avatarText: "text-white" },
  { name: "DuckDuckGo",  category: "Browser",      avatarBg: "bg-orange-400",  avatarText: "text-zinc-900" },
];

// ── Web category block list ───────────────────────────────────────────────────

const WEB_CATEGORIES = [
  { id: "adult",    label: "Adult Content",      description: "Blocks pornographic and explicit sites",       domains: "2,400+" },
  { id: "gambling", label: "Gambling",            description: "Blocks betting and gambling sites",             domains: "850+"   },
  { id: "drugs",    label: "Drugs & Alcohol",     description: "Blocks drug-related content",                  domains: "620+"   },
  { id: "selfharm", label: "Self Harm",           description: "Blocks self-harm related content",             domains: "380+"   },
  { id: "dating",   label: "Dating Apps & Sites", description: "Blocks dating platforms",                      domains: "1,200+" },
  { id: "proxy",    label: "Proxy & VPN Sites",   description: "Blocks sites that could bypass monitoring",    domains: "4,100+" },
  { id: "social",   label: "Social Media",        description: "Blocks major social platforms",                domains: "2,800+" },
] as const;

const CATEGORY_BADGE: Record<AppCategory, string> = {
  "Social Media": "bg-violet-100 text-violet-700",
  "Messaging":    "bg-blue-100 text-blue-700",
  "Dating":       "bg-rose-100 text-rose-700",
  "Gaming":       "bg-emerald-100 text-emerald-700",
  "Browser":      "bg-slate-100 text-slate-600",
};

function AppAvatar({ app, size = "sm" }: { app: AppEntry; size?: "sm" | "md" }) {
  const dim = size === "sm" ? "w-5 h-5 text-[10px]" : "w-6 h-6 text-xs";
  return (
    <span className={`inline-flex items-center justify-center rounded-md font-bold flex-shrink-0 ${dim} ${app.avatarBg} ${app.avatarText}`}>
      {app.name[0]}
    </span>
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

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50"
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

// ── Device Control Panel ──────────────────────────────────────────────────────

function DeviceControlPanel({
  device,
  status,
  tamperEvent,
  onClose,
  onSetStatus,
  onSetWebRestrictions,
  onRemoved,
}: {
  device: UiDevice;
  status: DeviceStatus;
  tamperEvent?: UiTamperEvent;
  onClose: () => void;
  onSetStatus: (id: string, status: DeviceStatus) => void;
  onSetWebRestrictions: (id: string, hasRestrictions: boolean) => void;
  onRemoved: (deviceDbId: string) => void;
}) {
  const [repairOpen, setRepairOpen] = useState(false);
  const [removeConfirm, setRemoveConfirm] = useState(false);
  const [removeLoading, setRemoveLoading] = useState(false);
  const [removeError, setRemoveError] = useState("");

  // Schedule
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [startTime, setStartTime] = useState("21:00");
  const [endTime, setEndTime]     = useState("07:00");
  const [days, setDays]           = useState<boolean[]>([true, true, true, true, true, true, true]);
  const [scheduleSaved, setScheduleSaved] = useState(false);

  // Blocked apps
  const [blockedApps, setBlockedApps]   = useState<string[]>([]);
  const [selectedApps, setSelectedApps] = useState<string[]>([]);
  const [appSearch, setAppSearch]       = useState("");

  // Blocked websites
  const [blockedCategories, setBlockedCategories] = useState<string[]>([]);
  const [customDomains, setCustomDomains]         = useState<string[]>([]);
  const [domainInput, setDomainInput]             = useState("");

  // Content monitoring
  const [contentMonitoring, setContentMonitoring] = useState<string[]>([]);

  useEffect(() => {
    onSetWebRestrictions(device.dbId, blockedCategories.length > 0 || customDomains.length > 0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blockedCategories, customDomains]);

  function handleAddDomain() {
    const d = domainInput.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
    if (d && !customDomains.includes(d)) {
      setCustomDomains((prev) => [...prev, d]);
    }
    setDomainInput("");
  }

  // Location
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationUpdated, setLocationUpdated] = useState(false);

  function toggleDay(i: number) {
    setDays((d) => d.map((v, idx) => (idx === i ? !v : v)));
  }

  function handleSaveSchedule() {
    setScheduleSaved(true);
    setTimeout(() => setScheduleSaved(false), 2000);
  }

  function toggleAppSelect(name: string) {
    setSelectedApps((prev) =>
      prev.includes(name) ? prev.filter((a) => a !== name) : [...prev, name]
    );
  }

  function handleBlockSelected() {
    setBlockedApps((prev) => [...prev, ...selectedApps.filter((a) => !prev.includes(a))]);
    setSelectedApps([]);
  }

  function handleRequestLocation() {
    setLocationLoading(true);
    setLocationUpdated(false);
    setTimeout(() => {
      setLocationLoading(false);
      setLocationUpdated(true);
    }, 2000);
  }

  const batteryColor = device.battery > 50 ? "text-emerald-600" : device.battery > 20 ? "text-amber-500" : "text-red-500";

  const dividerSection = "border-t border-slate-100 pt-5 mt-5";
  const sectionLabel   = "text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3";
  const inputClass     = "w-full px-3 py-1.5 text-sm text-slate-700 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 bg-white";

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/30" onClick={onClose} />

      <div className="w-[23rem] bg-white h-full shadow-2xl flex flex-col border-l border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-slate-100 flex-shrink-0">
              <DeviceTypeIcon type={device.type} className="w-5 h-5 text-slate-600" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-slate-800 truncate">{device.id}</h2>
              <p className="text-xs text-slate-400 mt-0.5 truncate">{device.assignedTo}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors flex-shrink-0 ml-2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">

          {/* ── TAMPER WARNING BANNER ── */}
          {tamperEvent && (
            <div className="mb-5 rounded-xl border border-red-200 bg-red-50 overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-2 bg-red-600">
                <svg className="w-4 h-4 text-white flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                </svg>
                <p className="text-xs font-bold text-white uppercase tracking-wide">Security Alert</p>
              </div>
              <div className="px-4 py-3 space-y-1">
                <p className="text-sm font-semibold text-red-800">
                  {tamperEvent.eventType} detected at{" "}
                  {new Date(tamperEvent.timestamp).toLocaleString("en-GB", { hour: "2-digit", minute: "2-digit", day: "numeric", month: "short" })}
                </p>
                <p className="text-xs text-red-600">Last known location: {tamperEvent.location.area}</p>
                <p className="text-xs text-red-500 mt-1">Device monitoring may be compromised.</p>
              </div>
              <div className="px-4 pb-4">
                <button
                  onClick={() => setRepairOpen(true)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                  Re-pair Device
                </button>
              </div>
            </div>
          )}

          {/* ── DEVICE INFO ── */}
          <p className={sectionLabel}>Device Info</p>
          <div className="bg-slate-50 rounded-xl border border-slate-100 divide-y divide-slate-100">
            {[
              { label: "Type",        value: <div className="flex items-center gap-1.5"><DeviceTypeIcon type={device.type} className="w-3.5 h-3.5 text-slate-500" /><span>{device.type}</span></div> },
              { label: "Manufacturer", value: device.manufacturer },
              { label: "Status", value: (
                <div className="flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${
                    status === "online" ? "bg-emerald-400" :
                    status === "restricted" ? "bg-orange-400" : "bg-slate-300"
                  }`} />
                  <span className={`font-medium ${
                    status === "online" ? "text-emerald-700" :
                    status === "restricted" ? "text-orange-700" : "text-slate-500"
                  }`}>
                    {status === "online" ? "Online" : status === "restricted" ? "Restricted" : "Offline"}
                  </span>
                </div>
              )},
              { label: "Last seen",   value: device.lastSeen },
              { label: "Battery",     value: <span className={batteryColor + " font-medium"}>{device.battery}%</span> },
              { label: "App version", value: device.appVersion },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between px-4 py-2.5">
                <span className="text-xs text-slate-500">{label}</span>
                <span className="text-xs text-slate-700">{value}</span>
              </div>
            ))}
          </div>

          {/* ── QUICK CONTROLS ── */}
          <div className={dividerSection}>
            <p className={sectionLabel}>Quick Controls</p>
            {status === "restricted" ? (
              <button
                onClick={() => onSetStatus(device.dbId, "online")}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl hover:bg-emerald-100 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.143 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
                </svg>
                Resume Internet
              </button>
            ) : (
              <button
                onClick={() => onSetStatus(device.dbId, "restricted")}
                disabled={status === "offline"}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-xl hover:bg-amber-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 4.243a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3" />
                </svg>
                Pause Internet
              </button>
            )}
            {status === "offline" && (
              <p className="text-xs text-slate-400 mt-2 text-center">Device is offline — controls unavailable</p>
            )}
          </div>

          {/* ── SCHEDULE ── */}
          <div className={dividerSection}>
            <div className="flex items-center justify-between mb-3">
              <p className={sectionLabel} style={{ marginBottom: 0 }}>Bedtime Schedule</p>
              <button
                type="button"
                onClick={() => setScheduleEnabled((v) => !v)}
                className={`relative inline-flex h-5 w-9 flex-shrink-0 rounded-full border-2 border-transparent transition-colors focus:outline-none ${
                  scheduleEnabled ? "bg-blue-600" : "bg-slate-200"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform ${
                    scheduleEnabled ? "translate-x-4" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            {scheduleEnabled && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Block from</label>
                    <input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Until</label>
                    <input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                </div>

                <div>
                  <p className="text-xs text-slate-500 mb-2">Active days</p>
                  <div className="flex gap-1.5 flex-wrap">
                    {DAYS.map((day, i) => (
                      <button
                        key={day}
                        type="button"
                        onClick={() => toggleDay(i)}
                        className={`w-9 h-9 text-xs font-medium rounded-lg transition-colors ${
                          days[i]
                            ? "bg-blue-600 text-white"
                            : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                        }`}
                      >
                        {day}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={handleSaveSchedule}
                  className={`w-full px-4 py-2 text-sm font-medium rounded-xl transition-colors ${
                    scheduleSaved
                      ? "bg-emerald-500 text-white"
                      : "bg-blue-600 text-white hover:bg-blue-700"
                  }`}
                >
                  {scheduleSaved ? "Saved!" : "Save Schedule"}
                </button>
              </div>
            )}
          </div>

          {/* ── BLOCKED APPS ── */}
          <div className={dividerSection}>
            <p className={sectionLabel}>Blocked Apps</p>

            {/* Currently blocked list */}
            {blockedApps.length > 0 && (
              <div className="mb-4">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Currently Blocked</p>
                <div className="space-y-1.5">
                  {blockedApps.map((name) => {
                    const info = APP_LIST.find((a) => a.name === name);
                    return (
                      <div
                        key={name}
                        className="flex items-center gap-2.5 px-3 py-2 bg-slate-50 rounded-lg border border-slate-100"
                      >
                        {info
                          ? <AppAvatar app={info} />
                          : <span className="inline-flex items-center justify-center w-5 h-5 rounded-md bg-slate-300 text-white text-[10px] font-bold">{name[0]}</span>
                        }
                        <span className="flex-1 text-xs font-medium text-slate-700 truncate">{name}</span>
                        {info && (
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0 ${CATEGORY_BADGE[info.category]}`}>
                            {info.category}
                          </span>
                        )}
                        <button
                          onClick={() => setBlockedApps((prev) => prev.filter((a) => a !== name))}
                          className="text-slate-300 hover:text-red-500 transition-colors flex-shrink-0 ml-1"
                          title="Unblock"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Block apps picker */}
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Block Apps</p>

            {/* Selected pills */}
            {selectedApps.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {selectedApps.map((name) => {
                  const info = APP_LIST.find((a) => a.name === name)!;
                  return (
                    <span
                      key={name}
                      className="inline-flex items-center gap-1 pl-1 pr-1.5 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[11px] font-medium"
                    >
                      <AppAvatar app={info} size="sm" />
                      {name}
                      <button
                        onClick={() => toggleAppSelect(name)}
                        className="ml-0.5 text-blue-400 hover:text-blue-700"
                      >
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </span>
                  );
                })}
              </div>
            )}

            {/* Search */}
            <div className="relative mb-1">
              <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={appSearch}
                onChange={(e) => setAppSearch(e.target.value)}
                placeholder="Search apps..."
                className="w-full pl-8 pr-3 py-1.5 text-xs text-slate-700 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 bg-white"
              />
            </div>

            {/* App list */}
            <div className="max-h-44 overflow-y-auto rounded-lg border border-slate-200 divide-y divide-slate-100">
              {APP_LIST
                .filter(
                  (app) =>
                    !blockedApps.includes(app.name) &&
                    app.name.toLowerCase().includes(appSearch.toLowerCase())
                )
                .map((app) => {
                  const checked = selectedApps.includes(app.name);
                  return (
                    <button
                      key={`${app.name}-${app.category}`}
                      type="button"
                      onClick={() => toggleAppSelect(app.name)}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors ${
                        checked ? "bg-blue-50" : "hover:bg-slate-50"
                      }`}
                    >
                      <AppAvatar app={app} />
                      <span className="flex-1 text-xs font-medium text-slate-700 truncate">{app.name}</span>
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0 ${CATEGORY_BADGE[app.category]}`}>
                        {app.category}
                      </span>
                      <div className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-colors ${
                        checked ? "bg-blue-600 border-blue-600" : "border-slate-300"
                      }`}>
                        {checked && (
                          <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                    </button>
                  );
                })}
              {APP_LIST.filter(
                (app) =>
                  !blockedApps.includes(app.name) &&
                  app.name.toLowerCase().includes(appSearch.toLowerCase())
              ).length === 0 && (
                <p className="text-xs text-slate-400 text-center py-4">No apps match your search</p>
              )}
            </div>

            {selectedApps.length > 0 && (
              <button
                onClick={handleBlockSelected}
                className="mt-2.5 w-full px-4 py-2 text-xs font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
              >
                Block {selectedApps.length} App{selectedApps.length > 1 ? "s" : ""}
              </button>
            )}
          </div>

          {/* ── BLOCKED WEBSITES ── */}
          <div className={dividerSection}>
            <p className={sectionLabel}>Blocked Websites</p>

            {/* Category toggles */}
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Category Blocking</p>
            <div className="space-y-1.5 mb-4">
              {WEB_CATEGORIES.map((cat) => {
                const active = blockedCategories.includes(cat.id);
                return (
                  <div
                    key={cat.id}
                    className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg border transition-colors ${
                      active ? "bg-red-50 border-red-200" : "bg-slate-50 border-slate-100"
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-semibold ${active ? "text-red-700" : "text-slate-700"}`}>
                        {cat.label}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{cat.domains} domains</p>
                    </div>
                    <button
                      onClick={() =>
                        setBlockedCategories((prev) =>
                          active ? prev.filter((c) => c !== cat.id) : [...prev, cat.id]
                        )
                      }
                      className={`relative inline-flex h-4 w-7 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
                        active ? "bg-red-500" : "bg-slate-200"
                      }`}
                    >
                      <span
                        className={`inline-block h-3 w-3 transform rounded-full bg-white shadow transition duration-200 ${
                          active ? "translate-x-3" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Custom domain blocking */}
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Block Specific Website</p>

            {/* Custom domain pills */}
            {customDomains.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {customDomains.map((domain) => (
                  <span
                    key={domain}
                    className="inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-full bg-red-50 border border-red-200 text-red-700 text-[11px] font-medium"
                  >
                    {domain}
                    <button
                      onClick={() => setCustomDomains((prev) => prev.filter((d) => d !== domain))}
                      className="text-red-300 hover:text-red-600 transition-colors ml-0.5"
                      title="Remove"
                    >
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Domain input */}
            <div className="flex gap-2">
              <input
                type="text"
                value={domainInput}
                onChange={(e) => setDomainInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddDomain(); } }}
                placeholder="e.g. example.com"
                className="flex-1 px-3 py-1.5 text-xs text-slate-700 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 bg-white placeholder-slate-400"
              />
              <button
                onClick={handleAddDomain}
                className="px-3 py-1.5 text-xs font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
              >
                Block
              </button>
            </div>
          </div>

          {/* ── CONTENT MONITORING ── */}
          <div className={dividerSection}>
            <p className={sectionLabel}>Content Monitoring</p>
            <div className="space-y-1.5">
              {[
                {
                  id: "messaging",
                  label: "Monitor Messaging Apps",
                  description: "Monitors WhatsApp, Snapchat, Telegram, and Instagram DMs for flagged content",
                },
                {
                  id: "keywords",
                  label: "Keyword Alerting",
                  description: "Alerts on self-harm, grooming, drug references, and explicit content keywords",
                },
                {
                  id: "screenshot",
                  label: "Screenshot on Detection",
                  description: "Captures a screenshot automatically when flagged content is detected",
                },
                {
                  id: "nudity",
                  label: "Alert on Nudity Detection",
                  description: "Uses on-device AI to detect and alert on nudity in images or videos",
                },
              ].map((item) => {
                const active = contentMonitoring.includes(item.id);
                return (
                  <div
                    key={item.id}
                    className="flex items-start gap-2.5 px-3 py-2.5 rounded-lg border border-slate-100 bg-slate-50"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-700">{item.label}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed">{item.description}</p>
                    </div>
                    <button
                      onClick={() =>
                        setContentMonitoring((prev) =>
                          active ? prev.filter((c) => c !== item.id) : [...prev, item.id]
                        )
                      }
                      className={`relative inline-flex h-4 w-7 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none mt-0.5 ${
                        active ? "bg-blue-600" : "bg-slate-200"
                      }`}
                    >
                      <span
                        className={`inline-block h-3 w-3 transform rounded-full bg-white shadow transition duration-200 ${
                          active ? "translate-x-3" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── LOCATION ── */}
          <div className={dividerSection}>
            <p className={sectionLabel}>Location</p>

            {/* Embedded OpenStreetMap */}
            <div className="rounded-xl overflow-hidden border border-slate-200 mb-3">
              <iframe
                src={`https://www.openstreetmap.org/export/embed.html?bbox=${device.location.lng - 0.01},${device.location.lat - 0.01},${device.location.lng + 0.01},${device.location.lat + 0.01}&marker=${device.location.lat},${device.location.lng}&layer=mapnik`}
                width="100%"
                height="160"
                style={{ border: "none" }}
                title="Device location map"
              />
            </div>

            {/* Area + timestamp */}
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-xs font-medium text-slate-700">{device.location.area}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Updated{" "}
                  {locationUpdated
                    ? "just now"
                    : new Date(device.location.updatedAt).toLocaleString("en-GB", {
                        day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
                      })}
                </p>
              </div>
              <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>

            {/* Open in maps buttons */}
            <div className="grid grid-cols-2 gap-2 mb-2">
              <a
                href={`https://www.google.com/maps?q=${device.location.lat},${device.location.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
              >
                <svg className="w-3.5 h-3.5 text-blue-500" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                </svg>
                Google Maps
              </a>
              <a
                href={`https://maps.apple.com/?q=${device.location.lat},${device.location.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
              >
                <svg className="w-3.5 h-3.5 text-slate-500" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                </svg>
                Apple Maps
              </a>
            </div>

            {/* Request update */}
            <button
              onClick={handleRequestLocation}
              disabled={locationLoading}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors disabled:opacity-60"
            >
              {locationLoading ? (
                <div className="w-4 h-4 border-2 border-slate-300 border-t-blue-500 rounded-full animate-spin" />
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              )}
              {locationLoading ? "Requesting..." : locationUpdated ? "Location Updated ✓" : "Request Location Update"}
            </button>
          </div>

          {/* ── REMOVE DEVICE ── */}
          <div className="px-4 pb-4 pt-2">
            {!removeConfirm ? (
              <button
                onClick={() => setRemoveConfirm(true)}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-red-600 bg-red-50 border border-red-200 rounded-xl hover:bg-red-100 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                </svg>
                Remove Device
              </button>
            ) : (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 space-y-2">
                <p className="text-xs text-red-700 font-medium text-center">
                  Remove <span className="font-bold">{device.id}</span> from this child&apos;s profile? This cannot be undone.
                </p>
                {removeError && <p className="text-xs text-red-600 text-center">{removeError}</p>}
                <div className="flex gap-2">
                  <button
                    onClick={() => { setRemoveConfirm(false); setRemoveError(""); }}
                    disabled={removeLoading}
                    className="flex-1 px-3 py-1.5 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      setRemoveLoading(true);
                      const { error } = await deleteDevice(device.dbId);
                      setRemoveLoading(false);
                      if (error) { setRemoveError(error); return; }
                      onRemoved(device.dbId);
                      onClose();
                    }}
                    disabled={removeLoading}
                    className="flex-1 px-3 py-1.5 text-xs font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    {removeLoading && <div className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
                    {removeLoading ? "Removing…" : "Yes, Remove"}
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Re-pair modal — z-60 to sit above this panel */}
      {repairOpen && (
        <RePairModal deviceId={device.id} onClose={() => setRepairOpen(false)} />
      )}
    </div>
  );
}

// ── Add Device Modal (2-step) ─────────────────────────────────────────────────

const MANUFACTURERS = ["Samsung", "Apple", "Google", "Huawei", "OnePlus", "Other"] as const;
type Manufacturer = typeof MANUFACTURERS[number];
type DeviceType = "Phone" | "Tablet";
type Ownership = "org" | "personal";
type AddDeviceStep = "details" | "pairing";

function AddDeviceModal({ child, onClose, onPaired }: { child: UiChild; onClose: () => void; onPaired: () => void }) {
  const [step, setStep] = useState<AddDeviceStep>("details");

  // Step 1 — Device Details
  const [deviceType, setDeviceType] = useState<DeviceType>("Tablet");
  const [manufacturer, setManufacturer] = useState<Manufacturer>("Samsung");
  const [model, setModel] = useState("");
  const [deviceName, setDeviceName] = useState("");
  const [ownership, setOwnership] = useState<Ownership>("org");

  // Step 2 — Pairing
  const [deviceDbId, setDeviceDbId] = useState<string | null>(null);
  const [pairingCode, setPairingCode] = useState("");
  const [connected, setConnected] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(600); // 10 min
  const [loading, setLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Countdown timer
  useEffect(() => {
    if (step !== "pairing" || connected || secondsLeft === 0) return;
    const id = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [step, connected, secondsLeft]);

  // Mark device as expired in DB when countdown hits zero
  useEffect(() => {
    if (secondsLeft === 0 && !connected && deviceDbId) {
      expirePairingCode(deviceDbId);
    }
  }, [secondsLeft, connected, deviceDbId]);

  // Poll for pairing completion every 3 seconds
  useEffect(() => {
    if (step !== "pairing" || connected || secondsLeft === 0 || !deviceDbId) return;
    const id = setInterval(async () => {
      const result = await checkPairingStatus(child.homeId, deviceDbId);
      if (result.isPaired) {
        setConnected(true);
      } else if (result.isExpired) {
        setSecondsLeft(0);
      }
    }, 3000);
    return () => clearInterval(id);
  }, [step, connected, secondsLeft, deviceDbId, child.homeId]);

  // Auto-close 2 seconds after successful pairing and refresh the list
  useEffect(() => {
    if (!connected) return;
    const id = setTimeout(() => {
      onPaired();
      onClose();
    }, 2000);
    return () => clearTimeout(id);
  }, [connected]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleNext() {
    const resolvedName = deviceName.trim() || `${manufacturer} ${deviceType}`;
    setDeviceName(resolvedName);
    setLoading(true);
    setCreateError(null);
    const result = await createDevice(child.id, child.homeId, {
      device_name: resolvedName,
      device_type: deviceType,
      manufacturer,
      model: model.trim() || null,
      ownership,
    });
    setLoading(false);
    if (result.error || !result.id) {
      setCreateError(result.error ?? "Failed to create device");
      return;
    }
    setDeviceDbId(result.id);
    setPairingCode(result.pairingCode);
    const expiresAt = new Date(result.pairingExpiresAt);
    setSecondsLeft(Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000)));
    setStep("pairing");
  }

  const expired = secondsLeft === 0 && !connected;
  const p1 = pairingCode.slice(0, 3);
  const p2 = pairingCode.slice(3);

  const fieldClass = "w-full px-3 py-2 text-sm text-slate-700 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 bg-white";
  const labelClass = "block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-semibold text-slate-800">Add Device</h2>
            <p className="text-xs text-slate-400 mt-0.5">{child.name} · Step {step === "details" ? "1" : "2"} of 2</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-0 px-6 pt-4 pb-0">
          {(["details", "pairing"] as const).map((s, i) => (
            <div key={s} className="flex items-center flex-1">
              <div className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold flex-shrink-0 ${
                step === s ? "bg-blue-600 text-white" : i === 0 && step === "pairing" ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-400"
              }`}>
                {i === 0 && step === "pairing" ? (
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : i + 1}
              </div>
              <span className={`ml-2 text-xs font-medium ${step === s ? "text-slate-700" : "text-slate-400"}`}>
                {s === "details" ? "Device Details" : "Pairing"}
              </span>
              {i === 0 && <div className="flex-1 mx-3 h-px bg-slate-200" />}
            </div>
          ))}
        </div>

        {/* ── Step 1: Device Details ── */}
        {step === "details" && (
          <>
            <div className="px-6 py-5 space-y-4">
              {/* Device Type */}
              <div>
                <label className={labelClass}>Device Type</label>
                <div className="flex rounded-lg border border-slate-200 p-0.5 gap-0.5">
                  {(["Phone", "Tablet"] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setDeviceType(t)}
                      className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                        deviceType === t ? "bg-blue-600 text-white" : "text-slate-500 hover:text-slate-700"
                      }`}
                    >
                      {t === "Phone"
                        ? <PhoneIcon className="w-4 h-4" />
                        : <TabletIcon className="w-4 h-4" />
                      }
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Manufacturer */}
              <div>
                <label className={labelClass}>Manufacturer</label>
                <select
                  value={manufacturer}
                  onChange={(e) => setManufacturer(e.target.value as Manufacturer)}
                  className={fieldClass}
                >
                  {MANUFACTURERS.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              {/* Model */}
              <div>
                <label className={labelClass}>
                  Model <span className="text-slate-400 font-normal normal-case">(optional)</span>
                </label>
                <input
                  type="text"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  placeholder={`e.g. ${manufacturer === "Apple" ? "iPad Pro 12.9" : manufacturer === "Samsung" ? "Galaxy A13" : "Model name"}`}
                  className={fieldClass}
                />
              </div>

              {/* Device Name */}
              <div>
                <label className={labelClass}>
                  Device Name <span className="text-slate-400 font-normal normal-case">(optional)</span>
                </label>
                <input
                  type="text"
                  value={deviceName}
                  onChange={(e) => setDeviceName(e.target.value)}
                  placeholder={`e.g. ${child.name.split(" ")[0]}'s ${deviceType}`}
                  className={fieldClass}
                />
                <p className="text-xs text-slate-400 mt-1">Leave blank to auto-fill as "{manufacturer} {deviceType}"</p>
              </div>

              {/* Ownership */}
              <div>
                <label className={labelClass}>Ownership</label>
                <div className="flex rounded-lg border border-slate-200 p-0.5 gap-0.5">
                  {([["org", "Organisation Device"], ["personal", "Personal Device"]] as const).map(([val, lbl]) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setOwnership(val)}
                      className={`flex-1 px-3 py-2 text-xs font-medium rounded-md transition-colors ${
                        ownership === val ? "bg-blue-600 text-white" : "text-slate-500 hover:text-slate-700"
                      }`}
                    >
                      {lbl}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {createError && (
              <p className="px-6 pb-2 text-xs text-red-600">{createError}</p>
            )}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleNext}
                disabled={loading}
                className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors ${loading ? "bg-blue-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"}`}
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    Next
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </>
                )}
              </button>
            </div>
          </>
        )}

        {/* ── Step 2: Pairing ── */}
        {step === "pairing" && (
          <>
            <div className="px-6 py-5 space-y-5">
              {/* Device name summary */}
              <div className="flex items-center gap-3 px-4 py-3 bg-slate-50 rounded-xl border border-slate-100">
                <DeviceTypeIcon type={deviceType} className="w-5 h-5 text-slate-400 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-700 truncate">{deviceName}</p>
                  <p className="text-xs text-slate-400">{ownership === "org" ? "Organisation Device" : "Personal Device"}</p>
                </div>
                <button
                  onClick={() => setStep("details")}
                  className="ml-auto text-xs text-blue-600 hover:text-blue-700 flex-shrink-0 font-medium"
                >
                  Edit
                </button>
              </div>

              {/* Pairing code */}
              <div className="flex flex-col items-center gap-3">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Pairing Code</p>
                <div className={`flex items-center gap-3 ${expired ? "opacity-40" : ""}`}>
                  <div className="flex gap-1.5">
                    {p1.split("").map((d, i) => (
                      <span key={i} className="flex items-center justify-center w-10 bg-slate-100 rounded-lg text-2xl font-bold text-slate-800 font-mono px-2.5 py-2.5">
                        {d}
                      </span>
                    ))}
                  </div>
                  <span className="text-2xl text-slate-300 font-light">–</span>
                  <div className="flex gap-1.5">
                    {p2.split("").map((d, i) => (
                      <span key={i} className="flex items-center justify-center w-10 bg-slate-100 rounded-lg text-2xl font-bold text-slate-800 font-mono px-2.5 py-2.5">
                        {d}
                      </span>
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
                    Open the <strong>SafeGuard app</strong> on the device and enter this code to pair it.
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
                    <p className="text-sm font-medium text-emerald-700">Device Connected Successfully</p>
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

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
              >
                {connected ? "Done" : "Close"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Add Child Modal ───────────────────────────────────────────────────────────

function AddChildModal({ homeId, onClose, onCreated, keyWorkerOptions }: {
  homeId: string | null;
  onClose: () => void;
  onCreated: (child: DbChild) => void;
  keyWorkerOptions: string[];
}) {
  const [form, setForm] = useState({
    initials: "",
    age: "",
    keyWorker: keyWorkerOptions[0] ?? "",
    notes: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  function set(key: string, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!homeId) {
      setError("No home selected. Please select a home before adding a child.");
      return;
    }

    setLoading(true);
    const result = await createChild({
      initials:   form.initials,
      age:        parseInt(form.age, 10),
      key_worker: form.keyWorker,
      notes:      form.notes || null,
      home_id:    homeId,
    });
    setLoading(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    // Build a minimal DbChild for the optimistic list update
    const newChild: DbChild = {
      id:         result.id!,
      home_id:    homeId,
      initials:   form.initials.trim().toUpperCase(),
      age:        parseInt(form.age, 10),
      key_worker: form.keyWorker,
      notes:      form.notes || null,
      created_at: new Date().toISOString(),
      devices:    [],
    };
    onCreated(newChild);
  }

  const fieldClass = "w-full px-3 py-2 text-sm text-slate-700 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 bg-white";
  const labelClass = "block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
          <div>
            <h2 className="text-base font-semibold text-slate-800">Add Child</h2>
            <p className="text-xs text-slate-400 mt-0.5">Register a new resident</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col overflow-y-auto">
          <div className="px-6 py-5 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Initials <span className="text-red-400">*</span></label>
                <input
                  type="text"
                  value={form.initials}
                  onChange={(e) => set("initials", e.target.value.toUpperCase())}
                  placeholder="e.g. A.B."
                  maxLength={6}
                  required
                  className={fieldClass}
                />
              </div>
              <div>
                <label className={labelClass}>Age <span className="text-red-400">*</span></label>
                <input
                  type="number"
                  value={form.age}
                  onChange={(e) => set("age", e.target.value)}
                  placeholder="e.g. 14"
                  min={5} max={18}
                  required
                  className={fieldClass}
                />
              </div>
            </div>

            <div>
              <label className={labelClass}>Key Worker <span className="text-red-400">*</span></label>
              <select
                value={form.keyWorker}
                onChange={(e) => set("keyWorker", e.target.value)}
                required
                className={fieldClass}
              >
                {keyWorkerOptions.map((kw) => (
                  <option key={kw} value={kw}>{kw}</option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelClass}>
                Notes <span className="text-slate-400 font-normal normal-case">(optional)</span>
              </label>
              <textarea
                value={form.notes}
                onChange={(e) => set("notes", e.target.value)}
                placeholder="Any relevant notes about the child..."
                rows={3}
                className="w-full px-3 py-2 text-sm text-slate-700 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 resize-none"
              />
            </div>
          </div>

          {error && (
            <div className="mx-6 mb-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
              {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 flex-shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? "Adding…" : "Add Child"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Edit Profile Panel ────────────────────────────────────────────────────────

function EditProfilePanel({ child, onClose, keyWorkerOptions }: { child: UiChild; onClose: () => void; keyWorkerOptions: string[] }) {
  const [form, setForm] = useState({
    initials: child.initials,
    age: String(child.age),
    keyWorker: child.keyWorker,
    notes: "",
  });

  function set(key: string, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  const fieldClass = "w-full px-3 py-2 text-sm text-slate-700 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 bg-white";
  const labelClass = "block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5";

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/30" onClick={onClose} />
      <div className="w-96 bg-white h-full shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
          <div>
            <h2 className="text-base font-semibold text-slate-800">Edit Profile</h2>
            <p className="text-xs text-slate-400 mt-0.5">{child.name}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          <div>
            <label className={labelClass}>Initials</label>
            <input
              type="text"
              value={form.initials}
              onChange={(e) => set("initials", e.target.value)}
              className={fieldClass}
            />
          </div>

          <div>
            <label className={labelClass}>Age</label>
            <input
              type="number"
              value={form.age}
              onChange={(e) => set("age", e.target.value)}
              min={5} max={18}
              className={fieldClass}
            />
          </div>

          <div>
            <label className={labelClass}>Key Worker</label>
            <select
              value={form.keyWorker}
              onChange={(e) => set("keyWorker", e.target.value)}
              className={fieldClass}
            >
              {keyWorkerOptions.map((kw) => (
                <option key={kw} value={kw}>{kw}</option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass}>
              Notes <span className="text-slate-400 font-normal normal-case">(optional)</span>
            </label>
            <textarea
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              placeholder="Add any relevant notes..."
              rows={4}
              className="w-full px-3 py-2 text-sm text-slate-700 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 resize-none"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Client Component ─────────────────────────────────────────────────────

interface Props {
  dbChildren: DbChild[];
  dbAlerts: DbAlert[];
  dbStaff: DbStaff[];
}

export default function ChildrenClient({ dbChildren, dbAlerts, dbStaff }: Props) {
  const { user, selectedHomeId } = useAuth();
  const router = useRouter();
  const [localChildren, setLocalChildren] = useState<DbChild[]>(dbChildren);
  const [addChildOpen,    setAddChildOpen]    = useState(false);
  const [addDeviceFor,    setAddDeviceFor]    = useState<UiChild | null>(null);
  const [editProfileFor,  setEditProfileFor]  = useState<UiChild | null>(null);
  const [controlDeviceId, setControlDeviceId] = useState<string | null>(null); // stores dbId (UUID)

  // Local status overrides — updated by Pause/Resume in DeviceControlPanel
  const [deviceStatuses, setDeviceStatuses] = useState<Record<string, DeviceStatus>>({});

  function handleSetStatus(id: string, status: DeviceStatus) {
    setDeviceStatuses((prev) => ({ ...prev, [id]: status }));
  }

  // Web restriction indicators — updated by DeviceControlPanel
  const [hasWebRestrictions, setHasWebRestrictions] = useState<Record<string, boolean>>({});

  function handleSetWebRestrictions(id: string, hasRestrictions: boolean) {
    setHasWebRestrictions((prev) => ({ ...prev, [id]: hasRestrictions }));
  }

  const homeId = selectedHomeId ?? user?.homeIds?.[0] ?? null;
  const allUiChildren = localChildren.map(mapDbChild);
  const homeChildren = allUiChildren.filter((c) => homeId !== null && c.homeId === homeId);

  // Staff for key worker dropdown — filter to those assigned to this home
  const keyWorkerOptions = dbStaff
    .filter((s) => s.role !== "readonly_staff" && s.staff_homes.some((sh) => sh.home_id === homeId))
    .map((s) => s.full_name);

  const homeName =
    user?.homeNames && user.homeIds && homeId
      ? (user.homeNames[user.homeIds.indexOf(homeId)] ?? user.homeNames[0] ?? "Residential Home")
      : "Residential Home";

  const controlDevice = controlDeviceId
    ? homeChildren.flatMap((c) => c.devices).find((d) => d.dbId === controlDeviceId) ?? null
    : null;

  // Derive tamper events from alerts with category = 'tamper', keyed by device UUID
  const tamperByDevice = dbAlerts
    .filter((a) => a.category === "tamper" && a.home_id === homeId && a.device_id)
    .reduce<Record<string, UiTamperEvent>>((acc, a) => {
      const key = a.device_id!;
      if (!acc[key] || a.created_at > acc[key].timestamp) {
        acc[key] = {
          eventType: a.alert_type ?? "Device Tamper",
          timestamp: a.created_at,
          location: {
            area: (a.last_location as { area?: string } | null)?.area ?? "Unknown",
          },
        };
      }
      return acc;
    }, {});

  return (
    <div className="flex-1 flex flex-col">
      <header className="flex items-center justify-between px-8 py-5 bg-white border-b border-slate-200">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">Children</h1>
          <p className="text-sm text-slate-500 mt-0.5">{homeChildren.length} residents · {homeName}</p>
        </div>
        <button
          onClick={() => setAddChildOpen(true)}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
        >
          + Add Child
        </button>
      </header>

      <main className="flex-1 p-8 space-y-4">
        {homeChildren.map((child) => {
          const alertCount = dbAlerts.filter(
            (a) => a.child_id === child.id && a.category !== "tamper"
          ).length;
          const assignedDevices = child.devices;

          return (
            <div key={child.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              {/* Main info row */}
              <div className="flex items-center gap-5 px-6 py-4 flex-wrap">
                {/* Avatar */}
                <div className="flex items-center justify-center w-10 h-10 rounded-full text-sm font-bold flex-shrink-0 bg-blue-100 text-blue-700">
                  {child.initials.replace(/\./g, "").slice(0, 2)}
                </div>

                {/* Name + age */}
                <div className="w-36 flex-shrink-0">
                  <p className="text-sm font-semibold text-slate-800">{child.name}</p>
                  <p className="text-xs text-slate-400">Age {child.age}</p>
                </div>

                <div className="w-px h-8 bg-slate-100 flex-shrink-0 hidden sm:block" />

                {/* Key Worker */}
                <div className="flex-shrink-0">
                  <p className="text-xs text-slate-400">Key Worker</p>
                  <p className="text-sm font-medium text-slate-700">{child.keyWorker}</p>
                </div>

                <div className="flex-1" />

                {/* Action buttons */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => setAddDeviceFor(child)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                    Add Device
                  </button>

                  <Link
                    href={`/alerts?child=${encodeURIComponent(child.initials)}`}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-100 rounded-lg hover:bg-blue-100 transition-colors whitespace-nowrap"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                    View Alerts
                    {alertCount > 0 && (
                      <span className="flex items-center justify-center min-w-[1rem] h-4 px-1 text-[10px] font-bold rounded-full bg-blue-600 text-white">
                        {alertCount}
                      </span>
                    )}
                  </Link>

                  <button
                    onClick={() => setEditProfileFor(child)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Edit Profile
                  </button>
                </div>
              </div>

              {/* Devices row */}
              <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex items-center gap-2.5 flex-wrap">
                <span className="text-xs text-slate-400 font-medium mr-1">Devices:</span>

                {assignedDevices.length === 0 && (
                  <span className="text-xs text-slate-400">No devices assigned</span>
                )}

                {assignedDevices.map((device) => {
                  const effectiveStatus = deviceStatuses[device.dbId] ?? device.status;
                  const cfg = deviceStatusConfig[effectiveStatus as DeviceStatus] ?? deviceStatusConfig["offline"];
                  const hasTamper = !!tamperByDevice[device.dbId];
                  const hasWebBlock = !!hasWebRestrictions[device.dbId];
                  return (
                    <div
                      key={device.dbId}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs ${hasTamper ? "bg-red-50 border-red-200" : cfg.pillBg}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
                      <DeviceTypeIcon type={device.type} className="w-3 h-3 text-slate-500 flex-shrink-0" />
                      <span className="font-medium text-slate-700">{device.id}</span>
                      {hasTamper && (
                        <svg className="w-3.5 h-3.5 text-red-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                        </svg>
                      )}
                      {hasWebBlock && (
                        <span className="relative flex-shrink-0" title="Web restrictions active">
                          <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                          </svg>
                          <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-red-500 rounded-full" />
                        </span>
                      )}
                      <span className={`font-medium ${hasTamper ? "text-red-600" : cfg.labelColor}`}>
                        {hasTamper ? tamperByDevice[device.dbId].eventType : cfg.label}
                      </span>
                      <span className="text-slate-300">·</span>
                      <span className="text-slate-400">{device.lastSeen}</span>
                      <span className="text-slate-300">·</span>
                      <button
                        onClick={() => setControlDeviceId(device.dbId)}
                        className={`font-semibold transition-colors ${hasTamper ? "text-red-600 hover:text-red-700" : "text-blue-600 hover:text-blue-700"}`}
                      >
                        Manage
                      </button>
                    </div>
                  );
                })}

                <button
                  onClick={() => setAddDeviceFor(child)}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-full border border-dashed border-slate-300 text-xs text-slate-400 hover:text-slate-600 hover:border-slate-400 transition-colors"
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  Add
                </button>
              </div>
            </div>
          );
        })}
      </main>

      {/* Modals & panels */}
      {addChildOpen && (
        <AddChildModal
          homeId={homeId}
          keyWorkerOptions={keyWorkerOptions}
          onClose={() => setAddChildOpen(false)}
          onCreated={(child) => {
            setLocalChildren((prev) => [...prev, child]);
            setAddChildOpen(false);
            router.refresh();
          }}
        />
      )}
      {addDeviceFor   && <AddDeviceModal child={addDeviceFor} onClose={() => setAddDeviceFor(null)} onPaired={() => { setAddDeviceFor(null); router.refresh(); }} />}
      {editProfileFor && <EditProfilePanel child={editProfileFor} onClose={() => setEditProfileFor(null)} keyWorkerOptions={keyWorkerOptions} />}
      {controlDevice  && (
        <DeviceControlPanel
          device={controlDevice}
          status={deviceStatuses[controlDevice.dbId] ?? controlDevice.status}
          tamperEvent={tamperByDevice[controlDevice.dbId]}
          onClose={() => setControlDeviceId(null)}
          onSetStatus={handleSetStatus}
          onSetWebRestrictions={handleSetWebRestrictions}
          onRemoved={(deviceDbId) => {
            setLocalChildren((prev) =>
              prev.map((c) => ({ ...c, devices: c.devices.filter((d) => d.id !== deviceDbId) }))
            );
            setControlDeviceId(null);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
