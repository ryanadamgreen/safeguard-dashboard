"use client";

import { useState } from "react";
import type { DbReport, DbReportSchedule, DbChild } from "../../lib/supabase/queries";
import {
  createReport,
  createReportSchedule,
  deleteReportSchedule,
} from "../../lib/supabase/actions";

// ─── Constants ────────────────────────────────────────────────────────────────

const REPORT_TYPES = [
  { value: "safeguarding_summary", label: "Safeguarding Summary" },
  { value: "critical_incident",    label: "Critical Incident" },
  { value: "monthly_overview",     label: "Monthly Overview" },
] as const;

const TYPE_COLOURS: Record<string, string> = {
  safeguarding_summary: "bg-blue-100 text-blue-700",
  critical_incident:    "bg-red-100 text-red-700",
  monthly_overview:     "bg-emerald-100 text-emerald-700",
};

const FREQUENCIES = [
  { value: "weekly",  label: "Weekly (every Monday)" },
  { value: "monthly", label: "Monthly (1st of month)" },
] as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function typeLabel(type: string) {
  return REPORT_TYPES.find((t) => t.value === type)?.label
    ?? type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function typeColour(type: string) {
  return TYPE_COLOURS[type] ?? "bg-slate-100 text-slate-600";
}

function fmt(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric", month: "short", year: "numeric",
  });
}

function fmtRange(start: string | null, end: string | null) {
  if (!start && !end) return "—";
  if (start && end) return `${fmt(start)} – ${fmt(end)}`;
  return start ? fmt(start) : fmt(end);
}

function fmtNextRun(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", {
    weekday: "short", day: "numeric", month: "short", year: "numeric",
  });
}

function childrenLabel(included: string[] | null, allCount: number) {
  if (!included) return `All (${allCount})`;
  if (included.length === 0) return `All (${allCount})`;
  return `${included.length} selected`;
}

// ─── Shared UI ────────────────────────────────────────────────────────────────

const inputCls = "w-full px-3 py-2 text-sm text-slate-700 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400";
const selectCls = inputCls + " appearance-none pr-8";

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
      {children}
    </label>
  );
}

function SectionCard({ title, subtitle, children }: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100">
        <h2 className="text-base font-semibold text-slate-800">{title}</h2>
        {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
      <div className="p-6">{children}</div>
    </section>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  reports: DbReport[];
  schedules: DbReportSchedule[];
  children: DbChild[];
  homes: { id: string; name: string }[];
  currentUserName: string;
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ReportsClient({ reports: initialReports, schedules: initialSchedules, children: allChildren, homes, currentUserName }: Props) {
  const [reports, setReports]     = useState(initialReports);
  const [schedules, setSchedules] = useState(initialSchedules);

  const defaultHomeId = homes[0]?.id ?? "";

  return (
    <div className="flex-1 flex flex-col">
      <header className="flex items-center px-8 py-5 bg-white border-b border-slate-200">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">Reports</h1>
          <p className="text-sm text-slate-500 mt-0.5">Generate, view, and schedule safeguarding reports</p>
        </div>
      </header>

      <main className="flex-1 p-8 space-y-8 max-w-4xl">
        <GenerateForm
          homes={homes}
          defaultHomeId={defaultHomeId}
          allChildren={allChildren}
          currentUserName={currentUserName}
          onCreated={(report) => setReports((prev) => [report, ...prev])}
        />

        <GeneratedTable reports={reports} allChildren={allChildren} />

        <SchedulesSection
          schedules={schedules}
          homes={homes}
          defaultHomeId={defaultHomeId}
          onCreated={(s) => setSchedules((prev) => [s, ...prev])}
          onDeleted={(id) => setSchedules((prev) => prev.filter((s) => s.id !== id))}
        />
      </main>
    </div>
  );
}

// ─── Section 1: Generate Report ───────────────────────────────────────────────

function GenerateForm({ homes, defaultHomeId, allChildren, currentUserName, onCreated }: {
  homes: { id: string; name: string }[];
  defaultHomeId: string;
  allChildren: DbChild[];
  currentUserName: string;
  onCreated: (report: DbReport) => void;
}) {
  const [homeId,    setHomeId]    = useState(defaultHomeId);
  const [type,      setType]      = useState("safeguarding_summary");
  const [startDate, setStartDate] = useState("");
  const [endDate,   setEndDate]   = useState("");
  const [childMode, setChildMode] = useState<"all" | "specific">("all");
  const [selected,  setSelected]  = useState<string[]>([]);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState("");
  const [success,   setSuccess]   = useState(false);

  const homeChildren = allChildren.filter((c) => c.home_id === homeId);

  function toggleChild(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!startDate || !endDate) { setError("Please select a start and end date."); return; }
    if (new Date(startDate) > new Date(endDate)) { setError("Start date must be before end date."); return; }
    if (childMode === "specific" && selected.length === 0) { setError("Select at least one child, or choose 'All children'."); return; }

    setLoading(true);
    const result = await createReport({
      type,
      date_range_start:  startDate,
      date_range_end:    endDate,
      home_id:           homeId,
      children_included: childMode === "all" ? null : selected,
    });

    if (result.error) { setError(result.error); setLoading(false); return; }

    // Build the local report object
    const home = homes.find((h) => h.id === homeId);
    const start = new Date(startDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
    const end   = new Date(endDate).toLocaleDateString("en-GB",   { day: "numeric", month: "short", year: "numeric" });
    const title = `${typeLabel(type)} — ${start} to ${end}`;
    const reportObject: DbReport = {
      id:                result.id!,
      title,
      type,
      status:            "pending",
      generated_at:      new Date().toISOString(),
      date_range_start:  startDate,
      date_range_end:    endDate,
      home_id:           homeId,
      generated_by:      null,
      children_included: childMode === "all" ? null : selected,
      file_url:          null,
      created_at:        new Date().toISOString(),
      homes:             home ? { name: home.name } : null,
      staff:             null,
    };

    // Call generate endpoint
    const genRes = await fetch("/api/reports/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reportId: result.id }),
    });
    const genJson = await genRes.json() as { fileUrl?: string; error?: string };

    setLoading(false);

    if (!genJson.fileUrl) {
      setError(genJson.error ?? "Report created but file generation failed.");
      return;
    }

    onCreated({ ...reportObject, status: "complete", file_url: genJson.fileUrl, staff: currentUserName ? { full_name: currentUserName } : null });
    setSuccess(true);
    setStartDate(""); setEndDate(""); setSelected([]); setChildMode("all");
    setTimeout(() => setSuccess(false), 3000);
  }

  return (
    <SectionCard title="Generate Report" subtitle="Create a new safeguarding report for your home">
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Home selector — only shown when assigned to multiple homes */}
        {homes.length > 1 && (
          <div>
            <Label>Home</Label>
            <div className="relative">
              <select value={homeId} onChange={(e) => { setHomeId(e.target.value); setSelected([]); }} className={selectCls}>
                {homes.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
              </select>
              <Chevron />
            </div>
          </div>
        )}

        {/* Report type */}
        <div>
          <Label>Report Type</Label>
          <div className="relative">
            <select value={type} onChange={(e) => setType(e.target.value)} className={selectCls}>
              {REPORT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
            <Chevron />
          </div>
        </div>

        {/* Date range */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Start Date</Label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputCls} />
          </div>
          <div>
            <Label>End Date</Label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className={inputCls} />
          </div>
        </div>

        {/* Children selector */}
        <div>
          <Label>Include Children</Label>
          <div className="flex gap-4 mb-3">
            {(["all", "specific"] as const).map((mode) => (
              <label key={mode} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="childMode"
                  value={mode}
                  checked={childMode === mode}
                  onChange={() => { setChildMode(mode); setSelected([]); }}
                  className="accent-blue-600"
                />
                <span className="text-sm text-slate-700">
                  {mode === "all" ? "All children" : "Select specific children"}
                </span>
              </label>
            ))}
          </div>

          {childMode === "specific" && (
            <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 max-h-48 overflow-y-auto">
              {homeChildren.length === 0 ? (
                <p className="px-4 py-3 text-sm text-slate-400">No children found for this home.</p>
              ) : homeChildren.map((child) => (
                <label key={child.id} className="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={selected.includes(child.id)}
                    onChange={() => toggleChild(child.id)}
                    className="accent-blue-600 w-4 h-4 flex-shrink-0"
                  />
                  <span className="text-sm font-medium text-slate-700">{child.initials}</span>
                  {child.age != null && (
                    <span className="text-xs text-slate-400">Age {child.age}</span>
                  )}
                </label>
              ))}
            </div>
          )}
        </div>

        {error   && <p className="text-sm text-red-500">{error}</p>}
        {success && <p className="text-sm text-emerald-600 font-medium">Report queued successfully.</p>}

        <div className="flex justify-end pt-1">
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed rounded-lg transition-colors"
          >
            {loading ? (
              <>
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Generating…
              </>
            ) : "Generate Report"}
          </button>
        </div>
      </form>
    </SectionCard>
  );
}

// ─── Section 2: Generated Reports ─────────────────────────────────────────────

function GeneratedTable({ reports, allChildren }: { reports: DbReport[]; allChildren: DbChild[] }) {
  const childrenByHomeId: Record<string, DbChild[]> = {};
  for (const c of allChildren) {
    if (!childrenByHomeId[c.home_id]) childrenByHomeId[c.home_id] = [];
    childrenByHomeId[c.home_id].push(c);
  }

  return (
    <SectionCard
      title="Generated Reports"
      subtitle={reports.length > 0 ? `${reports.length} report${reports.length !== 1 ? "s" : ""}` : undefined}
    >
      {reports.length === 0 ? (
        <p className="text-sm text-slate-400 py-4 text-center">No reports yet. Generate your first report above.</p>
      ) : (
        <div className="rounded-lg border border-slate-200 overflow-hidden">
          <table className="w-full text-sm" style={{tableLayout: "fixed"}}>
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wider w-[28%]">Title</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wider w-[16%]">Type</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wider w-[18%]">Date Range</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wider w-[10%]">Children</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wider w-[12%]">Generated</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wider w-[10%]">By</th>
                <th className="text-right px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wider w-[6%]"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {reports.map((r) => {
                const totalForHome = (childrenByHomeId[r.home_id] ?? []).length;
                return (
                <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3 font-medium text-slate-800">
                <p className="truncate text-sm">{r.title}</p>
                {r.homes?.name && (
                <p className="text-xs text-slate-400 mt-0.5 truncate">{r.homes.name}</p>
                )}
                </td>
                <td className="px-4 py-3">
                <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${typeColour(r.type)}`}>
                {typeLabel(r.type)}
                </span>
                </td>
                <td className="px-4 py-3 text-xs text-slate-500">
                {fmtRange(r.date_range_start, r.date_range_end)}
                </td>
                <td className="px-4 py-3 text-xs text-slate-500">
                {childrenLabel(r.children_included, totalForHome)}
                </td>
                <td className="px-4 py-3 text-xs text-slate-500">
                {fmt(r.generated_at)}
                </td>
                <td className="px-4 py-3 text-xs text-slate-500 truncate">
                {r.staff?.full_name ?? "—"}
                </td>
                <td className="px-4 py-3 text-right">
                      {r.file_url ? (
                        <a
                          href={r.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                          Download
                        </a>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-400 bg-slate-100 rounded-lg">
                          {r.status === "pending" ? (
                            <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                          ) : (
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                          )}
                          {r.status === "pending" ? "Generating…" : "Unavailable"}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </SectionCard>
  );
}

// ─── Section 3: Scheduled Reports ─────────────────────────────────────────────

function SchedulesSection({ schedules, homes, defaultHomeId, onCreated, onDeleted }: {
  schedules: DbReportSchedule[];
  homes: { id: string; name: string }[];
  defaultHomeId: string;
  onCreated: (s: DbReportSchedule) => void;
  onDeleted: (id: string) => void;
}) {
  const [homeId,     setHomeId]     = useState(defaultHomeId);
  const [type,       setType]       = useState("safeguarding_summary");
  const [frequency,  setFrequency]  = useState<"weekly" | "monthly">("monthly");
  const [recipients, setRecipients] = useState("");
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const emails = recipients.split(",").map((s) => s.trim()).filter(Boolean);
    if (emails.length === 0) { setError("Enter at least one recipient email."); return; }
    const invalid = emails.find((e) => !e.includes("@"));
    if (invalid) { setError(`Invalid email: ${invalid}`); return; }

    setLoading(true);
    const result = await createReportSchedule({ home_id: homeId, type, frequency, recipients: emails });
    setLoading(false);

    if (result.error) { setError(result.error); return; }

    const home = homes.find((h) => h.id === homeId);
    const now  = new Date();
    const nextRun = frequency === "weekly"
      ? new Date(now.getFullYear(), now.getMonth(), now.getDate() + ((8 - now.getDay()) % 7 || 7), 6)
      : new Date(now.getFullYear(), now.getMonth() + 1, 1, 6);

    onCreated({
      id:          result.id!,
      home_id:     homeId,
      type,
      frequency,
      recipients:  emails,
      created_by:  null,
      next_run_at: nextRun.toISOString(),
      created_at:  now.toISOString(),
      homes:       home ? { name: home.name } : null,
      staff:       null,
    });

    setRecipients(""); setType("safeguarding_summary"); setFrequency("monthly");
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    const { error } = await deleteReportSchedule(id);
    setDeletingId(null);
    if (!error) onDeleted(id);
  }

  return (
    <SectionCard
      title="Scheduled Reports"
      subtitle="Automatically generate and email reports on a recurring schedule"
    >
      {/* Existing schedules */}
      {schedules.length > 0 && (
        <div className="mb-6 space-y-2">
          {schedules.map((s) => (
            <div key={s.id} className="flex items-start justify-between gap-4 p-4 bg-slate-50 border border-slate-200 rounded-lg">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${typeColour(s.type)}`}>
                    {typeLabel(s.type)}
                  </span>
                  <span className="text-xs font-medium text-slate-600 capitalize bg-slate-200 px-2 py-0.5 rounded-full">
                    {s.frequency}
                  </span>
                  {s.homes?.name && (
                    <span className="text-xs text-slate-500">{s.homes.name}</span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-1.5">
                  <span className="font-medium text-slate-600">Next run:</span> {fmtNextRun(s.next_run_at)}
                </p>
                {s.recipients.length > 0 && (
                  <p className="text-xs text-slate-400 mt-0.5 truncate">
                    Recipients: {s.recipients.join(", ")}
                  </p>
                )}
              </div>
              <button
                onClick={() => handleDelete(s.id)}
                disabled={deletingId === s.id}
                className="flex-shrink-0 text-xs font-medium text-red-500 hover:text-red-700 disabled:opacity-40 transition-colors"
              >
                {deletingId === s.id ? "Removing…" : "Remove"}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add schedule form */}
      <form onSubmit={handleAdd} className="space-y-4">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Add Schedule</p>

        {homes.length > 1 && (
          <div>
            <Label>Home</Label>
            <div className="relative">
              <select value={homeId} onChange={(e) => setHomeId(e.target.value)} className={selectCls}>
                {homes.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
              </select>
              <Chevron />
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Report Type</Label>
            <div className="relative">
              <select value={type} onChange={(e) => setType(e.target.value)} className={selectCls}>
                {REPORT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
              <Chevron />
            </div>
          </div>
          <div>
            <Label>Frequency</Label>
            <div className="relative">
              <select value={frequency} onChange={(e) => setFrequency(e.target.value as "weekly" | "monthly")} className={selectCls}>
                {FREQUENCIES.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
              </select>
              <Chevron />
            </div>
          </div>
        </div>

        <div>
          <Label>Recipients (comma-separated emails)</Label>
          <input
            type="text"
            value={recipients}
            onChange={(e) => setRecipients(e.target.value)}
            placeholder="manager@home.org, deputy@home.org"
            className={inputCls}
          />
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed rounded-lg transition-colors"
          >
            {loading ? "Saving…" : "Add Schedule"}
          </button>
        </div>
      </form>
    </SectionCard>
  );
}

// ─── Shared icon ──────────────────────────────────────────────────────────────

function Chevron() {
  return (
    <svg className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  );
}
