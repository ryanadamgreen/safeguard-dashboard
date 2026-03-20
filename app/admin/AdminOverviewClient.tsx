"use client";

import { useState, useRef, useEffect } from "react";
import { DbHome, DbStaff, DbOrganisation } from "../lib/supabase/queries";

// ─── helpers ─────────────────────────────────────────────────────────────────

function buildInitialAssignments(dbStaff: DbStaff[]): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>();
  for (const s of dbStaff) {
    for (const sh of s.staff_homes) {
      const set = map.get(sh.home_id) ?? new Set<string>();
      set.add(s.id);
      map.set(sh.home_id, set);
    }
  }
  return map;
}

function getTrialDaysRemaining(iso: string): number {
  return Math.ceil((new Date(iso).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

function formatTrialDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function getHomeStaff(homeId: string, assignments: Map<string, Set<string>>, dbStaff: DbStaff[]): DbStaff[] {
  const ids = assignments.get(homeId) ?? new Set();
  return dbStaff.filter((s) => ids.has(s.id));
}

function getUnassignedStaff(homeId: string, assignments: Map<string, Set<string>>, dbStaff: DbStaff[]): DbStaff[] {
  const ids = assignments.get(homeId) ?? new Set();
  return dbStaff.filter((s) => !ids.has(s.id));
}

const roleBadgeColors: Record<string, string> = {
  home_staff:     "bg-blue-50 text-blue-700 ring-1 ring-blue-600/20",
  readonly_staff: "bg-slate-100 text-slate-600 ring-1 ring-slate-200",
  admin:          "bg-purple-50 text-purple-700 ring-1 ring-purple-600/20",
};

// ─── Assign-staff dropdown ────────────────────────────────────────────────────

function AssignDropdown({
  candidates,
  onAssign,
  onClose,
}: {
  homeId: string;
  candidates: DbStaff[];
  onAssign: (staffId: string) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="absolute right-0 top-full mt-1 w-64 bg-white border border-slate-200 rounded-xl shadow-lg z-30 overflow-hidden"
    >
      <div className="px-3 py-2 border-b border-slate-100">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Assign Staff</p>
      </div>
      {candidates.length === 0 ? (
        <p className="px-4 py-3 text-sm text-slate-400">All staff already assigned</p>
      ) : (
        <div className="max-h-56 overflow-y-auto divide-y divide-slate-50">
          {candidates.map((s) => {
            const avatarLetters = s.full_name.split(" ").filter(Boolean).map(w => w[0]).join("").toUpperCase().slice(0, 2);
            return (
              <button
                key={s.id}
                onClick={() => { onAssign(s.id); onClose(); }}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-left"
              >
                <div className="flex items-center justify-center w-7 h-7 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex-shrink-0">
                  {avatarLetters}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-700 truncate">{s.full_name}</p>
                  <p className="text-xs text-slate-400 truncate">{s.job_title ?? "Read-only"}</p>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Filter pill ──────────────────────────────────────────────────────────────

function FilterPill({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 ring-1 ring-blue-600/20">
      {label}
      <button onClick={onRemove} className="hover:text-blue-900 transition-colors">
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </span>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  dbHomes: DbHome[];
  dbStaff: DbStaff[];
  dbOrgs: DbOrganisation[];
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminOverviewClient({ dbHomes, dbStaff, dbOrgs }: Props) {
  const [assignments, setAssignments] = useState<Map<string, Set<string>>>(() => buildInitialAssignments(dbStaff));
  const [openDropdown, setOpenDropdown] = useState<string | null>(null); // homeId UUID

  // Filters
  const [filterCompany, setFilterCompany] = useState<string>("");
  const [filterHome, setFilterHome] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<"active" | "inactive" | "">("");

  function assignStaff(homeId: string, staffId: string) {
    setAssignments((prev) => {
      const next = new Map(prev);
      const set = new Set(next.get(homeId) ?? []);
      set.add(staffId);
      next.set(homeId, set);
      return next;
    });
  }

  function removeStaff(homeId: string, staffId: string) {
    setAssignments((prev) => {
      const next = new Map(prev);
      const set = new Set(next.get(homeId) ?? []);
      set.delete(staffId);
      next.set(homeId, set);
      return next;
    });
  }

  const orgName = (home: DbHome) => dbOrgs.find(o => o.id === home.organisation_id)?.name ?? "";

  const filteredHomes = dbHomes.filter((h) => {
    if (filterCompany && orgName(h) !== filterCompany) return false;
    if (filterHome && h.id !== filterHome) return false;
    if (filterStatus && h.status !== filterStatus) return false;
    return true;
  });

  const hasActiveFilters = filterCompany !== "" || filterHome !== "" || filterStatus !== "";

  function clearFilters() {
    setFilterCompany("");
    setFilterHome("");
    setFilterStatus("");
  }

  const selectClass = "px-3 py-1.5 text-sm text-slate-600 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 appearance-none pr-8 cursor-pointer";

  return (
    <div className="flex-1 flex flex-col">
      {/* Top bar */}
      <header className="flex items-center justify-between px-8 py-5 bg-white border-b border-slate-200">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">Overview</h1>
          <p className="text-sm text-slate-500 mt-0.5">{dbHomes.length} homes · staff assignments</p>
        </div>
      </header>

      {/* Filter bar */}
      <div className="px-8 py-4 bg-white border-b border-slate-100">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative">
            <select value={filterCompany} onChange={(e) => setFilterCompany(e.target.value)} className={selectClass}>
              <option value="">All companies</option>
              {dbOrgs.map((o) => <option key={o.id} value={o.name}>{o.name}</option>)}
            </select>
            <svg className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
          </div>

          <div className="relative">
            <select value={filterHome} onChange={(e) => setFilterHome(e.target.value)} className={selectClass}>
              <option value="">All homes</option>
              {dbHomes.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
            </select>
            <svg className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
          </div>

          <div className="relative">
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as "active" | "inactive" | "")} className={selectClass}>
              <option value="">All statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            <svg className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
          </div>

          {hasActiveFilters && (
            <button onClick={clearFilters} className="px-3 py-1.5 text-xs font-medium text-slate-500 hover:text-slate-700 transition-colors">
              Clear all
            </button>
          )}
        </div>

        {hasActiveFilters && (
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            {filterCompany && <FilterPill label={filterCompany} onRemove={() => setFilterCompany("")} />}
            {filterHome && <FilterPill label={dbHomes.find((h) => h.id === filterHome)?.name ?? ""} onRemove={() => setFilterHome("")} />}
            {filterStatus && <FilterPill label={filterStatus === "active" ? "Active" : "Inactive"} onRemove={() => setFilterStatus("")} />}
          </div>
        )}
      </div>

      <main className="flex-1 p-8 space-y-6">
        {/* Trial organisations panel */}
        {dbOrgs.filter((o) => o.subscription_status === "trialing").length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex-shrink-0">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </span>
                <h2 className="text-sm font-semibold text-slate-700">Active Trials</h2>
              </div>
              <span className="text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">
                {dbOrgs.filter((o) => o.subscription_status === "trialing").length} organisation{dbOrgs.filter((o) => o.subscription_status === "trialing").length !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="divide-y divide-slate-50">
              {dbOrgs
                .filter((o) => o.subscription_status === "trialing")
                .sort((a, b) => {
                  const dA = a.trial_expires_at ? getTrialDaysRemaining(a.trial_expires_at) : 999;
                  const dB = b.trial_expires_at ? getTrialDaysRemaining(b.trial_expires_at) : 999;
                  return dA - dB;
                })
                .map((o) => {
                  const days = o.trial_expires_at ? getTrialDaysRemaining(o.trial_expires_at) : null;
                  const expiringSoon = days !== null && days <= 7 && days > 0;
                  const expired = days !== null && days <= 0;
                  return (
                    <div key={o.id} className={`flex items-center gap-4 px-6 py-4 ${expiringSoon ? "bg-amber-50/50" : ""}`}>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold text-slate-800">{o.name}</p>
                          {expiringSoon && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                              </svg>
                              Expiring soon
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {o.trial_expires_at ? `Trial expires: ${formatTrialDate(o.trial_expires_at)}` : "No expiry set"}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        {days !== null && (
                          expired ? (
                            <p className="text-sm font-semibold text-red-600">Expired</p>
                          ) : (
                            <p className={`text-sm font-semibold ${expiringSoon ? "text-amber-700" : "text-blue-600"}`}>
                              {days} day{days !== 1 ? "s" : ""} remaining
                            </p>
                          )
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {filteredHomes.length === 0 && (
          <p className="text-sm text-slate-400 py-8 text-center">No homes match the current filters.</p>
        )}

        {filteredHomes.map((home) => {
          const homeStaff = getHomeStaff(home.id, assignments, dbStaff);
          const candidates = getUnassignedStaff(home.id, assignments, dbStaff);
          const isDropdownOpen = openDropdown === home.id;

          return (
            <div key={home.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              {/* Home info row */}
              <div className="px-6 py-5 border-b border-slate-100">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap mb-1">
                      <h2 className="text-base font-semibold text-slate-800">{home.name}</h2>
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        home.status === "active"
                          ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20"
                          : "bg-red-50 text-red-700 ring-1 ring-red-600/20"
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${home.status === "active" ? "bg-emerald-500" : "bg-red-500"}`} />
                        {home.status === "active" ? "Active" : "Inactive"}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mb-3">{orgName(home)}</p>

                    <div className="grid grid-cols-2 xl:grid-cols-4 gap-x-8 gap-y-2 text-sm">
                      <div>
                        <span className="text-slate-400 text-xs font-medium uppercase tracking-wide">SC/URN</span>
                        <p className="font-medium text-slate-700 mt-0.5">{home.sc_urn ?? "—"}</p>
                      </div>
                      <div>
                        <span className="text-slate-400 text-xs font-medium uppercase tracking-wide">Address</span>
                        <p className="font-medium text-slate-700 mt-0.5">{home.address ?? "—"}</p>
                      </div>
                      <div>
                        <span className="text-slate-400 text-xs font-medium uppercase tracking-wide">Responsible Individual</span>
                        <p className="font-medium text-slate-700 mt-0.5">{home.responsible_individual ?? "—"}</p>
                      </div>
                      <div className="flex gap-6">
                        <div>
                          <span className="text-slate-400 text-xs font-medium uppercase tracking-wide">Children</span>
                          <p className="font-bold text-slate-800 mt-0.5 text-lg">0</p>
                        </div>
                        <div>
                          <span className="text-slate-400 text-xs font-medium uppercase tracking-wide">Staff</span>
                          <p className="font-bold text-slate-800 mt-0.5 text-lg">{homeStaff.length}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Staff assigned section */}
              <div className="px-6 py-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Staff Assigned · {homeStaff.length}
                  </p>
                  <div className="relative">
                    <button
                      onClick={() => setOpenDropdown(isDropdownOpen ? null : home.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                      </svg>
                      Assign Staff
                      <svg className={`w-3 h-3 transition-transform ${isDropdownOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {isDropdownOpen && (
                      <AssignDropdown
                        homeId={home.id}
                        candidates={candidates}
                        onAssign={(staffId) => assignStaff(home.id, staffId)}
                        onClose={() => setOpenDropdown(null)}
                      />
                    )}
                  </div>
                </div>

                {homeStaff.length === 0 ? (
                  <p className="text-sm text-slate-400 py-2">No staff assigned to this home yet.</p>
                ) : (
                  <div className="divide-y divide-slate-50 -mx-6 px-6">
                    {homeStaff.map((member) => {
                      const memberInitials = member.full_name.split(" ").filter(Boolean).map(w => w[0]).join("").toUpperCase().slice(0, 2);
                      return (
                        <div key={member.id} className="flex items-center gap-3 py-3">
                          <div className="flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold flex-shrink-0 bg-blue-100 text-blue-700">
                            {memberInitials}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-800">{member.full_name}</p>
                            <p className="text-xs text-slate-400">{member.job_title ?? "Read-only Access"}</p>
                          </div>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${roleBadgeColors[member.role] ?? "bg-slate-100 text-slate-600"}`}>
                            {member.role === "home_staff" ? "Home Staff" : "Read-only"}
                          </span>
                          <button
                            onClick={() => removeStaff(home.id, member.id)}
                            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors ml-1"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                            Remove
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </main>
    </div>
  );
}
