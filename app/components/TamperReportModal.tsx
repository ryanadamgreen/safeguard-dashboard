"use client";

import { useState } from "react";
import { useAuth } from "./AuthProvider";
import type { TamperEvent } from "../lib/types";
import { generateTamperReport } from "../lib/generateTamperReport";

interface Props {
  event: TamperEvent;
  homeName: string;
  onClose: () => void;
}

export function TamperReportModal({ event, homeName, onClose }: Props) {
  const { user } = useAuth();
  const [notes, setNotes] = useState("");

  const eventTime = new Date(event.timestamp).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const coords = `${event.location.lat}°N, ${Math.abs(event.location.lng)}°${event.location.lng < 0 ? "W" : "E"}`;

  function handleDownload() {
    generateTamperReport(event, user?.name ?? "Unknown", homeName, notes);
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
            <h2 className="text-base font-semibold text-slate-800">Download Security Report</h2>
            <p className="text-xs text-slate-400 mt-0.5">{event.description} — {event.childInitials} · {event.device}</p>
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
          {/* Event summary */}
          <div className="p-4 bg-red-50 rounded-xl border border-red-100 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-red-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <span className="text-sm font-semibold text-red-800">{event.description}</span>
              </div>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-full bg-red-600 text-white">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                </svg>
                Tamper — Critical
              </span>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
              <span className="text-slate-500">Child initials: <span className="font-semibold text-slate-700">{event.childInitials}</span></span>
              <span className="text-slate-500">Device: <span className="font-semibold text-slate-700">{event.device}</span></span>
              <span className="text-slate-500">Time: <span className="font-semibold text-slate-700">{eventTime}</span></span>
              <span className="text-slate-500">Coordinates: 
                {event.location.lat !== 0 || event.location.lng !== 0 ? (
                  <a
                    href={`https://www.google.com/maps?q=${event.location.lat},${event.location.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-red-600 hover:text-red-700 underline"
                  >
                    {event.location.lat.toFixed(5)}, {event.location.lng.toFixed(5)} ↗
                  </a>
                ) : (
                  <span className="font-semibold text-slate-700">Not available</span>
                )}
              </span>
              <span className="col-span-2 text-slate-500">Last known location: <span className="font-semibold text-slate-700">{event.location.area}</span></span>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Staff Observations <span className="font-normal normal-case text-slate-400">(optional — will be included in the report)</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Record any observations, immediate actions taken, or follow-up steps before generating the report..."
              rows={4}
              className="w-full px-3 py-2.5 text-sm text-slate-700 bg-white border border-slate-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-400 placeholder-slate-400"
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
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
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
