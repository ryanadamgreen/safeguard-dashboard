"use client";

import { useState } from "react";
import { useAuth } from "../../components/AuthProvider";
import { generateReport, type ReportConfig } from "../../lib/generateReport";
import type { Alert, TamperEvent, Child } from "../../lib/types";
import { type DbAlert, type DbChild } from "../../lib/supabase/queries";

// ─── Constants ───────────────────────────────────────────────────────────────

const weeklyAlerts = [
  { day: "Mon", count: 3 },
  { day: "Tue", count: 5 },
  { day: "Wed", count: 2 },
  { day: "Thu", count: 7 },
  { day: "Fri", count: 4 },
  { day: "Sat", count: 1 },
  { day: "Sun", count: 2 },
];
const maxCount = Math.max(...weeklyAlerts.map((d) => d.count));

// ─── Report type definitions ─────────────────────────────────────────────────

interface ReportType {
  id: string;
  name: string;
  description: string;
  suitableFor: string;
  hasChildSelector: boolean;
}

interface ReportCategory {
  name: string;
  types: ReportType[];
}

const REPORT_CATEGORIES: ReportCategory[] = [
  {
    name: "Safeguarding Reports",
    types: [
      {
        id: "safeguarding-summary",
        name: "Safeguarding Summary Report",
        description: "Overview of all alerts for a date range, broken down by child, severity and type.",
        suitableFor: "Ofsted, Placing Authority",
        hasChildSelector: false,
      },
      {
        id: "critical-incident",
        name: "Critical Incident Report",
        description: "Detailed report of all Critical and High severity alerts. Includes child initials, event details, timestamps and last known location.",
        suitableFor: "Registered Manager, Ofsted",
        hasChildSelector: false,
      },
      {
        id: "individual-child",
        name: "Individual Child Report",
        description: "All alerts and device activity for a single child. Select child from dropdown.",
        suitableFor: "Key Worker, Social Worker",
        hasChildSelector: true,
      },
      {
        id: "tamper-security",
        name: "Tamper & Security Report",
        description: "All device tampering events including VPN disabled, app uninstalled, permissions revoked. Includes last known locations.",
        suitableFor: "Registered Manager, Responsible Individual",
        hasChildSelector: false,
      },
    ],
  },
  {
    name: "Device Reports",
    types: [
      {
        id: "device-usage",
        name: "Device Usage Summary",
        description: "App usage time per child per device for a date range.",
        suitableFor: "Home Manager, Support Worker",
        hasChildSelector: false,
      },
      {
        id: "app-activity",
        name: "App Activity Report",
        description: "Which apps were used and for how long across all devices.",
        suitableFor: "Home Manager, Registered Manager",
        hasChildSelector: false,
      },
      {
        id: "blocked-apps",
        name: "Blocked Apps Report",
        description: "Summary of apps blocked and any bypass attempts.",
        suitableFor: "Manager, Ofsted",
        hasChildSelector: false,
      },
    ],
  },
  {
    name: "Compliance Reports",
    types: [
      {
        id: "monthly-overview",
        name: "Monthly Safeguarding Overview",
        description: "Full monthly summary suitable for sending to placing authorities or social workers. Includes all alerts, trends and device status.",
        suitableFor: "Placing Authority, Social Worker",
        hasChildSelector: false,
      },
      {
        id: "ofsted-evidence",
        name: "Ofsted Evidence Pack",
        description: "Comprehensive report pack covering safeguarding activity, device controls used, incidents logged and actions taken.",
        suitableFor: "Ofsted Inspection",
        hasChildSelector: false,
      },
      {
        id: "social-worker-update",
        name: "Social Worker Update",
        description: "Summary report per child for sharing with their allocated social worker. Anonymised where possible.",
        suitableFor: "Social Worker, Allocated Key Worker",
        hasChildSelector: true,
      },
    ],
  },
];

const ALL_REPORT_TYPES = REPORT_CATEGORIES.flatMap((c) => c.types);

// ─── Generated reports ───────────────────────────────────────────────────────

interface GeneratedReport {
  id: number;
  title: string;
  typeId: string;
  typeName: string;
  generated: string;
  dateRange: string;
  childrenIncluded: string;
  generatedBy: string;
}

const TYPE_BADGE: Record<string, string> = {
  "safeguarding-summary": "bg-blue-50 text-blue-700 ring-1 ring-blue-600/20",
  "critical-incident":    "bg-red-50 text-red-700 ring-1 ring-red-600/20",
  "individual-child":     "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20",
  "tamper-security":      "bg-orange-50 text-orange-700 ring-1 ring-orange-600/20",
  "device-usage":         "bg-cyan-50 text-cyan-700 ring-1 ring-cyan-600/20",
  "app-activity":         "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-600/20",
  "blocked-apps":         "bg-slate-100 text-slate-600 ring-1 ring-slate-400/20",
  "monthly-overview":     "bg-purple-50 text-purple-700 ring-1 ring-purple-600/20",
  "ofsted-evidence":      "bg-amber-50 text-amber-700 ring-1 ring-amber-600/20",
  "social-worker-update": "bg-teal-50 text-teal-700 ring-1 ring-teal-600/20",
};

const TYPE_LABEL: Record<string, string> = {
  "safeguarding-summary": "Safeguarding",
  "critical-incident":    "Critical Incident",
  "individual-child":     "Individual Child",
  "tamper-security":      "Tamper & Security",
  "device-usage":         "Device Usage",
  "app-activity":         "App Activity",
  "blocked-apps":         "Blocked Apps",
  "monthly-overview":     "Monthly Overview",
  "ofsted-evidence":      "Ofsted Evidence",
  "social-worker-update": "Social Worker",
};

const INITIAL_REPORTS: GeneratedReport[] = [
  {
    id: 1,
    title: "Safeguarding Summary — March 2026",
    typeId: "safeguarding-summary",
    typeName: "Safeguarding Summary Report",
    generated: "17 Mar 2026",
    dateRange: "1–17 Mar 2026",
    childrenIncluded: "All children",
    generatedBy: "Sarah Johnson",
  },
  {
    id: 2,
    title: "Critical Incident Report — Mar 2026",
    typeId: "critical-incident",
    typeName: "Critical Incident Report",
    generated: "16 Mar 2026",
    dateRange: "1–16 Mar 2026",
    childrenIncluded: "J.S., L.M.",
    generatedBy: "Mark Davies",
  },
  {
    id: 3,
    title: "Monthly Safeguarding Overview — Feb 2026",
    typeId: "monthly-overview",
    typeName: "Monthly Safeguarding Overview",
    generated: "1 Mar 2026",
    dateRange: "Feb 2026",
    childrenIncluded: "All children",
    generatedBy: "Sarah Johnson",
  },
];

// ─── Schedules ───────────────────────────────────────────────────────────────

interface Schedule {
  id: number;
  reportTypeName: string;
  typeId: string;
  frequency: string;
  recipients: string[];
}

const INITIAL_SCHEDULES: Schedule[] = [
  {
    id: 1,
    reportTypeName: "Weekly Safeguarding Summary",
    typeId: "safeguarding-summary",
    frequency: "Weekly (every Monday)",
    recipients: ["sarah@oakwoodhouse.org", "m.davies@oakwood.org.uk"],
  },
  {
    id: 2,
    reportTypeName: "Monthly Safeguarding Overview",
    typeId: "monthly-overview",
    frequency: "Monthly (1st of month)",
    recipients: ["sarah@oakwoodhouse.org"],
  },
];

const FREQ_OPTIONS = [
  "Weekly (every Monday)",
  "Monthly (1st of month)",
  "After every critical alert",
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtShort(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

// ─── Props ───────────────────────────────────────────────────────────────────

interface ReportsClientProps {
  dbAlerts: DbAlert[];
  dbChildren: DbChild[];
}

// ─── Page component ──────────────────────────────────────────────────────────

export default function ReportsClient({ dbAlerts, dbChildren }: ReportsClientProps) {
  const { user, selectedHomeId } = useAuth();

  const homeId = selectedHomeId ?? "";
  const homeAlerts = dbAlerts.filter(a => a.home_id === homeId && a.category !== "tamper");
  const homeTamper = dbAlerts.filter(a => a.home_id === homeId && a.category === "tamper");
  const homeChildren = dbChildren.filter(c => c.home_id === homeId);
  const alertsBySeverity = {
    critical: homeAlerts.filter(a => a.severity === "critical").length,
    high:     homeAlerts.filter(a => a.severity === "high").length,
    medium:   homeAlerts.filter(a => a.severity === "medium").length,
    low:      homeAlerts.filter(a => a.severity === "low").length,
  };
  const totalAlertsMar = homeAlerts.length + homeTamper.length;

  // New report modal
  const [newReportOpen, setNewReportOpen] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedType, setSelectedType] = useState<ReportType | null>(null);
  const [dateFrom, setDateFrom] = useState("2026-03-01");
  const [dateTo, setDateTo]     = useState("2026-03-19");
  const [selectedChild, setSelectedChild] = useState("all");
  const [includeTamper, setIncludeTamper] = useState(true);
  const [reportNotes, setReportNotes]     = useState("");

  // Generated reports
  const [reports, setReports]     = useState<GeneratedReport[]>(INITIAL_REPORTS);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Schedule modal
  const [scheduleOpen, setScheduleOpen]           = useState(false);
  const [editScheduleId, setEditScheduleId]       = useState<number | null>(null);
  const [scheduleTypeId, setScheduleTypeId]       = useState("safeguarding-summary");
  const [scheduleFreq, setScheduleFreq]           = useState(FREQ_OPTIONS[0]);
  const [scheduleRecipients, setScheduleRecipients] = useState<string[]>(["sarah@oakwoodhouse.org"]);
  const [scheduleNewEmail, setScheduleNewEmail]   = useState("");
  const [schedules, setSchedules] = useState<Schedule[]>(INITIAL_SCHEDULES);

  // ── New report handlers ──────────────────────────────────────────────────

  function openNewReport() {
    setStep(1);
    setSelectedType(null);
    setReportNotes("");
    setNewReportOpen(true);
  }

  function closeNewReport() {
    setNewReportOpen(false);
  }

  function pickType(type: ReportType) {
    setSelectedType(type);
    if (!type.hasChildSelector) setSelectedChild("all");
    setStep(2);
  }

  function handleGenerate() {
    if (!selectedType) return;
    const fromLabel = dateFrom ? fmtShort(dateFrom) : "";
    const toLabel   = dateTo   ? fmtShort(dateTo)   : "";
    const config: ReportConfig = {
      reportTypeId:   selectedType.id,
      reportTypeName: selectedType.name,
      homeName:       "Oakwood House",
      homeAddress:    "",
      staffName:      user?.name ?? "Unknown Staff",
      dateFrom:       fromLabel,
      dateTo:         toLabel,
      selectedChild,
      includeTamper,
      notes:          reportNotes,
      alerts:         [] as Alert[],
      tamperEvents:   [] as TamperEvent[],
      children:       [] as Child[],
    };
    generateReport(config);

    const childLabel = selectedChild === "all" ? "All children" : selectedChild;
    const rangeLabel = fromLabel && toLabel ? `${fromLabel} – ${toLabel}` : "All dates";
    setReports((prev) => [
      {
        id: Date.now(),
        title: `${selectedType.name}${selectedChild !== "all" ? ` — ${selectedChild}` : ""}`,
        typeId: selectedType.id,
        typeName: selectedType.name,
        generated: fmtShort(new Date().toISOString()),
        dateRange: rangeLabel,
        childrenIncluded: childLabel,
        generatedBy: user?.name ?? "Unknown Staff",
      },
      ...prev,
    ]);
    closeNewReport();
  }

  function handleScheduleFromReport() {
    if (selectedType) {
      setScheduleTypeId(selectedType.id);
      setScheduleFreq(FREQ_OPTIONS[0]);
      setScheduleRecipients(["sarah@oakwoodhouse.org"]);
      setEditScheduleId(null);
    }
    closeNewReport();
    setScheduleOpen(true);
  }

  // ── Schedule handlers ────────────────────────────────────────────────────

  function openScheduleModal() {
    setScheduleTypeId("safeguarding-summary");
    setScheduleFreq(FREQ_OPTIONS[0]);
    setScheduleRecipients(["sarah@oakwoodhouse.org"]);
    setScheduleNewEmail("");
    setEditScheduleId(null);
    setScheduleOpen(true);
  }

  function editSchedule(s: Schedule) {
    setScheduleTypeId(s.typeId);
    setScheduleFreq(s.frequency);
    setScheduleRecipients([...s.recipients]);
    setScheduleNewEmail("");
    setEditScheduleId(s.id);
    setScheduleOpen(true);
  }

  function addRecipient() {
    const email = scheduleNewEmail.trim();
    if (email && !scheduleRecipients.includes(email)) {
      setScheduleRecipients((prev) => [...prev, email]);
    }
    setScheduleNewEmail("");
  }

  function removeRecipient(email: string) {
    setScheduleRecipients((prev) => prev.filter((e) => e !== email));
  }

  function saveSchedule() {
    const typeName = ALL_REPORT_TYPES.find((t) => t.id === scheduleTypeId)?.name ?? scheduleTypeId;
    if (editScheduleId !== null) {
      setSchedules((prev) =>
        prev.map((s) =>
          s.id === editScheduleId
            ? { ...s, reportTypeName: typeName, typeId: scheduleTypeId, frequency: scheduleFreq, recipients: scheduleRecipients }
            : s
        )
      );
    } else {
      setSchedules((prev) => [
        ...prev,
        { id: Date.now(), reportTypeName: typeName, typeId: scheduleTypeId, frequency: scheduleFreq, recipients: scheduleRecipients },
      ]);
    }
    setScheduleOpen(false);
  }

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="flex-1 flex flex-col">
      {/* Top bar */}
      <header className="flex items-center justify-between px-8 py-5 bg-white border-b border-slate-200">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">Reports</h1>
          <p className="text-sm text-slate-500 mt-0.5">Safeguarding analytics · Oakwood House · March 2026</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={openScheduleModal}
            className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Schedule report
          </button>
          <button
            onClick={openNewReport}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            New Report
          </button>
        </div>
      </header>

      <main className="flex-1 p-8 space-y-8 overflow-y-auto">
        {/* Stat cards */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-5">
          {[
            { label: "Total Alerts (Mar)", value: totalAlertsMar,                                  sub: "Alerts + tamper events",      color: "bg-blue-500"   },
            { label: "Critical Incidents",  value: alertsBySeverity.critical,                       sub: "Require Ofsted logging",       color: "bg-red-500"    },
            { label: "Children Monitored",  value: homeChildren.length,                             sub: "Active residential placements", color: "bg-purple-500" },
            { label: "Reports Generated",   value: reports.length,                                  sub: "This month",                   color: "bg-emerald-500"},
          ].map((card) => (
            <div key={card.label} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex items-start gap-4">
              <div className={`w-10 h-10 rounded-lg ${card.color} flex items-center justify-center flex-shrink-0`}>
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800">{card.value}</p>
                <p className="text-sm font-medium text-slate-600">{card.label}</p>
                <p className="text-xs text-slate-400 mt-0.5">{card.sub}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Charts row */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Weekly bar chart */}
          <div className="xl:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100">
              <h2 className="text-sm font-semibold text-slate-700">Alerts This Week</h2>
              <p className="text-xs text-slate-400 mt-0.5">Daily alert volume · 11–17 March 2026</p>
            </div>
            <div className="px-6 py-6">
              <div className="flex items-end gap-3 h-36">
                {weeklyAlerts.map((d) => {
                  const heightPct = Math.round((d.count / maxCount) * 100);
                  return (
                    <div key={d.day} className="flex-1 flex flex-col items-center gap-1.5">
                      <span className="text-xs font-semibold text-slate-500">{d.count}</span>
                      <div className="w-full rounded-t-md bg-blue-500 transition-all" style={{ height: `${heightPct}%`, minHeight: "4px" }} />
                      <span className="text-xs text-slate-400">{d.day}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Severity breakdown */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100">
              <h2 className="text-sm font-semibold text-slate-700">Alert Breakdown</h2>
              <p className="text-xs text-slate-400 mt-0.5">By severity · current month</p>
            </div>
            <div className="px-6 py-5 space-y-4">
              {[
                { label: "Critical", count: alertsBySeverity.critical, bar: "bg-red-500",    text: "text-red-600"    },
                { label: "High",     count: alertsBySeverity.high,     bar: "bg-orange-400", text: "text-orange-600" },
                { label: "Medium",   count: alertsBySeverity.medium,   bar: "bg-yellow-400", text: "text-yellow-600" },
                { label: "Low",      count: alertsBySeverity.low,      bar: "bg-green-400",  text: "text-green-600"  },
              ].map((s) => {
                const pct = homeAlerts.length > 0 ? Math.round((s.count / homeAlerts.length) * 100) : 0;
                return (
                  <div key={s.label}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm text-slate-600">{s.label}</span>
                      <span className={`text-sm font-semibold ${s.text}`}>{s.count}</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2">
                      <div className={`h-2 rounded-full ${s.bar}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Generated reports table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-semibold text-slate-700">Generated Reports</h2>
              <p className="text-xs text-slate-400 mt-0.5">Reports available to download · {reports.length} total</p>
            </div>
          </div>

          {/* Table header */}
          <div className="grid grid-cols-[2.5fr_1.5fr_1.2fr_1.5fr_1.8fr_1.5fr_auto] gap-3 px-6 py-3 bg-slate-50 border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wider">
            <span>Report Title</span>
            <span>Type</span>
            <span>Generated</span>
            <span>Date Range</span>
            <span>Children</span>
            <span>Generated By</span>
            <span>Actions</span>
          </div>

          <div className="divide-y divide-slate-50">
            {reports.length === 0 ? (
              <div className="px-6 py-10 text-center text-sm text-slate-400">No reports generated yet.</div>
            ) : (
              reports.map((report) => (
                <div
                  key={report.id}
                  className="grid grid-cols-[2.5fr_1.5fr_1.2fr_1.5fr_1.8fr_1.5fr_auto] gap-3 px-6 py-4 items-center hover:bg-slate-50/70 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-slate-100 flex-shrink-0">
                      <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <p className="text-sm font-medium text-slate-800 truncate">{report.title}</p>
                  </div>
                  <div>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${TYPE_BADGE[report.typeId] ?? "bg-slate-100 text-slate-600"}`}>
                      {TYPE_LABEL[report.typeId] ?? report.typeName}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm text-slate-600">{report.generated}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-600">{report.dateRange}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-600 truncate">{report.childrenIncluded}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-600">{report.generatedBy}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button className="text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors whitespace-nowrap">
                      Download
                    </button>
                    {deletingId === report.id ? (
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => { setReports((prev) => prev.filter((r) => r.id !== report.id)); setDeletingId(null); }}
                          className="text-xs font-semibold text-red-600 hover:text-red-700 transition-colors"
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => setDeletingId(null)}
                          className="text-xs font-medium text-slate-400 hover:text-slate-600 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeletingId(report.id)}
                        className="text-xs font-medium text-slate-400 hover:text-red-500 transition-colors"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Active schedules */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-semibold text-slate-700">Scheduled Reports</h2>
              <p className="text-xs text-slate-400 mt-0.5">Recurring reports generated automatically</p>
            </div>
            <button
              onClick={openScheduleModal}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Add schedule
            </button>
          </div>
          {schedules.length === 0 ? (
            <div className="px-6 py-10 text-center text-sm text-slate-400">No scheduled reports configured.</div>
          ) : (
            <div className="divide-y divide-slate-50">
              {schedules.map((s) => (
                <div key={s.id} className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50/70 transition-colors">
                  <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800">{s.reportTypeName}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{s.frequency} · {s.recipients.length} recipient{s.recipients.length !== 1 ? "s" : ""}</p>
                  </div>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${TYPE_BADGE[s.typeId] ?? "bg-slate-100 text-slate-600"}`}>
                    {TYPE_LABEL[s.typeId] ?? s.typeId}
                  </span>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => editSchedule(s)}
                      className="text-xs font-medium text-slate-500 hover:text-slate-700 transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setSchedules((prev) => prev.filter((x) => x.id !== s.id))}
                      className="text-xs font-medium text-slate-400 hover:text-red-500 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* ── New Report Modal ─────────────────────────────────────────────────── */}
      {newReportOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={(e) => { if (e.target === e.currentTarget) closeNewReport(); }}
        >
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl flex flex-col max-h-[88vh]">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
              <div className="flex items-center gap-3">
                {step === 2 && (
                  <button
                    onClick={() => setStep(1)}
                    className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                )}
                <div>
                  <h2 className="text-base font-semibold text-slate-800">
                    {step === 1 ? "New Report" : selectedType?.name}
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {step === 1 ? "Choose a report type to generate" : "Configure options and generate your report"}
                  </p>
                </div>
              </div>
              <button
                onClick={closeNewReport}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Step 1 — Report type picker */}
            {step === 1 && (
              <div className="overflow-y-auto px-6 py-5 space-y-6">
                {REPORT_CATEGORIES.map((cat) => (
                  <div key={cat.name}>
                    <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">{cat.name}</h3>
                    <div className="space-y-2">
                      {cat.types.map((type) => (
                        <button
                          key={type.id}
                          onClick={() => pickType(type)}
                          className="w-full text-left flex items-start gap-4 p-4 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 transition-colors group"
                        >
                          <div className="w-8 h-8 rounded-lg bg-slate-100 group-hover:bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors">
                            <svg className="w-4 h-4 text-slate-500 group-hover:text-blue-600 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-slate-800 group-hover:text-blue-700 transition-colors">{type.name}</p>
                            <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{type.description}</p>
                            <p className="text-xs text-slate-400 mt-1.5">
                              <span className="font-medium">Suitable for:</span> {type.suitableFor}
                            </p>
                          </div>
                          <svg className="w-4 h-4 text-slate-300 group-hover:text-blue-400 flex-shrink-0 mt-1 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}

                {/* Scheduled reports info */}
                <div>
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Scheduled Reports</h3>
                  <div className="p-4 rounded-xl border border-dashed border-slate-200 bg-slate-50 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span className="text-xs text-slate-500">Weekly Safeguarding Summary — auto-generated every Monday</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span className="text-xs text-slate-500">Monthly Overview — auto-generated on 1st of each month</span>
                    </div>
                    <button
                      onClick={() => { closeNewReport(); openScheduleModal(); }}
                      className="text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors mt-1"
                    >
                      Manage schedules →
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2 — Configuration */}
            {step === 2 && selectedType && (
              <>
                <div className="overflow-y-auto px-6 py-5 space-y-5">
                  {/* Suitable for info */}
                  <p className="text-xs text-slate-400 leading-relaxed">
                    <span className="font-semibold text-slate-500">Suitable for:</span> {selectedType.suitableFor}
                  </p>

                  {/* Date range */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Date Range</label>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">From</label>
                        <input
                          type="date"
                          value={dateFrom}
                          onChange={(e) => setDateFrom(e.target.value)}
                          className="w-full px-3 py-2 text-sm text-slate-700 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">To</label>
                        <input
                          type="date"
                          value={dateTo}
                          onChange={(e) => setDateTo(e.target.value)}
                          className="w-full px-3 py-2 text-sm text-slate-700 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Child selector */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                      Children Included
                      {!selectedType.hasChildSelector && <span className="font-normal normal-case text-slate-400 ml-1">(optional — filter to one child)</span>}
                    </label>
                    <select
                      value={selectedChild}
                      onChange={(e) => setSelectedChild(e.target.value)}
                      className="w-full px-3 py-2 text-sm text-slate-700 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
                    >
                      <option value="all">All Children</option>
                      {homeChildren.map((c) => (
                        <option key={c.id} value={c.initials}>{c.initials}</option>
                      ))}
                    </select>
                  </div>

                  {/* Include tamper toggle */}
                  <div className="flex items-center justify-between py-2">
                    <div>
                      <p className="text-sm font-medium text-slate-700">Include tamper events</p>
                      <p className="text-xs text-slate-400 mt-0.5">Add device security events to this report</p>
                    </div>
                    <button
                      onClick={() => setIncludeTamper((v) => !v)}
                      className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${includeTamper ? "bg-blue-600" : "bg-slate-200"}`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 ${includeTamper ? "translate-x-4" : "translate-x-0"}`} />
                    </button>
                  </div>

                  {/* Staff notes */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                      Staff Notes <span className="font-normal normal-case text-slate-400">(optional — included in report)</span>
                    </label>
                    <textarea
                      value={reportNotes}
                      onChange={(e) => setReportNotes(e.target.value)}
                      placeholder="Add any context, observations or notes to include in the report..."
                      rows={3}
                      className="w-full px-3 py-2.5 text-sm text-slate-700 bg-white border border-slate-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 placeholder-slate-400"
                    />
                  </div>

                  <p className="text-xs text-slate-400 leading-relaxed">
                    The report will open in a new tab formatted for printing or saving as PDF.
                    <strong className="text-slate-500"> {user?.name ?? "Your name"}</strong> will be recorded as the generating staff member.
                  </p>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-slate-100 flex-shrink-0">
                  <button
                    onClick={handleScheduleFromReport}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Schedule
                  </button>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={closeNewReport}
                      className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleGenerate}
                      className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Generate Report
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Schedule Modal ────────────────────────────────────────────────────── */}
      {scheduleOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={(e) => { if (e.target === e.currentTarget) setScheduleOpen(false); }}
        >
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md flex flex-col max-h-[88vh]">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
              <div>
                <h2 className="text-base font-semibold text-slate-800">
                  {editScheduleId !== null ? "Edit Schedule" : "Schedule Report"}
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">Set up a recurring automated report</p>
              </div>
              <button
                onClick={() => setScheduleOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Body */}
            <div className="overflow-y-auto px-6 py-5 space-y-5">
              {/* Report type */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Report Type</label>
                <select
                  value={scheduleTypeId}
                  onChange={(e) => setScheduleTypeId(e.target.value)}
                  className="w-full px-3 py-2 text-sm text-slate-700 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
                >
                  {REPORT_CATEGORIES.map((cat) => (
                    <optgroup key={cat.name} label={cat.name}>
                      {cat.types.map((type) => (
                        <option key={type.id} value={type.id}>{type.name}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>

              {/* Frequency */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Frequency</label>
                <div className="space-y-2">
                  {FREQ_OPTIONS.map((freq) => (
                    <label key={freq} className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-50 transition-colors">
                      <input
                        type="radio"
                        name="freq"
                        value={freq}
                        checked={scheduleFreq === freq}
                        onChange={() => setScheduleFreq(freq)}
                        className="text-blue-600"
                      />
                      <span className="text-sm text-slate-700">{freq}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Recipients */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Recipients</label>
                <div className="space-y-1.5 mb-2">
                  {scheduleRecipients.map((email) => (
                    <div key={email} className="flex items-center justify-between px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg">
                      <span className="text-sm text-slate-700">{email}</span>
                      <button
                        onClick={() => removeRecipient(email)}
                        className="text-slate-400 hover:text-red-500 transition-colors"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={scheduleNewEmail}
                    onChange={(e) => setScheduleNewEmail(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addRecipient(); } }}
                    placeholder="Add email address"
                    className="flex-1 px-3 py-2 text-sm text-slate-700 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 placeholder-slate-400"
                  />
                  <button
                    onClick={addRecipient}
                    className="px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-100 rounded-lg hover:bg-blue-100 transition-colors"
                  >
                    Add
                  </button>
                </div>
              </div>

            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 flex-shrink-0">
              <button
                onClick={() => setScheduleOpen(false)}
                className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={saveSchedule}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
              >
                {editScheduleId !== null ? "Save Changes" : "Save Schedule"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
