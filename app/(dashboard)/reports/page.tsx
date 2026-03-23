export default function ReportsPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-8">
      <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-slate-800 border border-slate-700">
        <svg className="w-7 h-7 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      </div>
      <div>
        <h1 className="text-xl font-semibold text-slate-200 mb-1">Reports coming soon</h1>
        <p className="text-sm text-slate-500 max-w-sm">
          Reporting tools are under development. Check back soon for safeguarding summaries and compliance exports.
        </p>
      </div>
    </div>
  );
}
