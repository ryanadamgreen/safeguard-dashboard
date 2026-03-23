"use client";

import type { DbReport } from "../../lib/supabase/queries";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<string, string> = {
  safeguarding_summary: "Safeguarding Summary",
  weekly_alert:         "Weekly Alert Summary",
  monthly_compliance:   "Monthly Compliance",
  incident:             "Incident Report",
};

const TYPE_COLOURS: Record<string, string> = {
  safeguarding_summary: "bg-blue-100 text-blue-700",
  weekly_alert:         "bg-amber-100 text-amber-700",
  monthly_compliance:   "bg-emerald-100 text-emerald-700",
  incident:             "bg-red-100 text-red-700",
};

function typeLabel(type: string) {
  return TYPE_LABELS[type] ?? type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function typeColour(type: string) {
  return TYPE_COLOURS[type] ?? "bg-slate-100 text-slate-600";
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric", month: "short", year: "numeric",
  });
}

function formatDateRange(start: string | null, end: string | null) {
  if (!start && !end) return "—";
  if (start && end) return `${formatDate(start)} – ${formatDate(end)}`;
  return start ? formatDate(start) : formatDate(end!);
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ReportsClient({ reports }: { reports: DbReport[] }) {
  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-8 py-5 bg-white border-b border-slate-200">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">Reports</h1>
          <p className="text-sm text-slate-500 mt-0.5">Safeguarding and compliance reports for your homes</p>
        </div>
      </header>

      <main className="flex-1 p-8">
        {reports.length === 0 ? (
          <EmptyState />
        ) : (
          <ReportsTable reports={reports} />
        )}
      </main>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 text-center">
      <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-slate-100 border border-slate-200">
        <svg className="w-7 h-7 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      </div>
      <div>
        <p className="text-base font-semibold text-slate-700">No reports yet</p>
        <p className="text-sm text-slate-500 mt-1 max-w-sm">
          Reports will appear here once they have been generated for your homes.
        </p>
      </div>
    </div>
  );
}

function ReportsTable({ reports }: { reports: DbReport[] }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100 bg-slate-50">
            <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Title</th>
            <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Type</th>
            <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">Home</th>
            <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden lg:table-cell">Date Range</th>
            <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden lg:table-cell">Generated</th>
            <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden xl:table-cell">By</th>
            <th className="px-5 py-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {reports.map((report) => (
            <tr key={report.id} className="hover:bg-slate-50 transition-colors">
              <td className="px-5 py-4 font-medium text-slate-800 max-w-[220px] truncate">
                {report.title}
              </td>
              <td className="px-5 py-4">
                <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${typeColour(report.type)}`}>
                  {typeLabel(report.type)}
                </span>
              </td>
              <td className="px-5 py-4 text-slate-600 hidden md:table-cell">
                {report.homes?.name ?? "—"}
              </td>
              <td className="px-5 py-4 text-slate-500 hidden lg:table-cell whitespace-nowrap">
                {formatDateRange(report.date_range_start, report.date_range_end)}
              </td>
              <td className="px-5 py-4 text-slate-500 hidden lg:table-cell whitespace-nowrap">
                {formatDate(report.generated_at)}
              </td>
              <td className="px-5 py-4 text-slate-500 hidden xl:table-cell">
                {report.staff?.full_name ?? "—"}
              </td>
              <td className="px-5 py-4 text-right">
                {report.file_url ? (
                  <a
                    href={report.file_url}
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
                  <span className="text-xs text-slate-400">No file</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
