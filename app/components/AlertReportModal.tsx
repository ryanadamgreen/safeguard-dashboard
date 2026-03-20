"use client";

import { useState } from "react";
import { useAuth } from "./AuthProvider";
import type { Alert } from "../lib/types";
import { generateAlertReport } from "../lib/generateAlertReport";
import SeverityBadge from "./SeverityBadge";

interface Props {
  alert: Alert;
  homeName: string;
  onClose: () => void;
}

export function AlertReportModal({ alert, homeName, onClose }: Props) {
  const { user } = useAuth();
  const [notes, setNotes] = useState("");

  const alertTime = new Date(alert.timestamp).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  function handleDownload() {
    generateAlertReport(alert, user?.name ?? "Unknown", homeName, notes);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
          <div>
            <h2 className="text-base font-semibold text-slate-800">Download Alert Report</h2>
            <p className="text-xs text-slate-400 mt-0.5">Alert #{alert.id} — {alert.alertType}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5 overflow-y-auto">
          {/* Alert summary */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-semibold text-slate-800">{alert.alertType}</span>
              <SeverityBadge severity={alert.severity} />
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
              <span className="text-slate-500">Child initials: <span className="font-semibold text-slate-700">{alert.childInitials}</span></span>
              <span className="text-slate-500">Age: <span className="font-semibold text-slate-700">{alert.childAge}</span></span>
              <span className="text-slate-500">Device: <span className="font-semibold text-slate-700">{alert.device}</span></span>
              <span className="text-slate-500">Time: <span className="font-semibold text-slate-700">{alertTime}</span></span>
              <span className="col-span-2 text-slate-500">Location: <span className="font-semibold text-slate-700">{alert.location}</span></span>
            </div>
            <div className="pt-2 border-t border-slate-200">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Trigger</p>
              <p className="text-xs font-mono text-orange-800 bg-orange-50 rounded px-2 py-1.5 break-all">{alert.triggerContent}</p>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Staff Notes <span className="font-normal normal-case text-slate-400">(optional — will be included in the report)</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any observations, actions taken, or follow-up notes before generating the report..."
              rows={4}
              className="w-full px-3 py-2.5 text-sm text-slate-700 bg-white border border-slate-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 placeholder-slate-400"
            />
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            The report will open in a new tab formatted for printing or saving as PDF.
            <strong className="text-slate-500"> {user?.name ?? "Your name"}</strong> will be recorded as the reporting staff member.
          </p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleDownload}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Download PDF
          </button>
        </div>
      </div>
    </div>
  );
}
