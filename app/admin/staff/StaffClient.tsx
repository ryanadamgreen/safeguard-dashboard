"use client";

import { useState } from "react";
import { DbStaff, DbHome, DbOrganisation } from "../../lib/supabase/queries";
import { inviteStaff, updateStaff } from "../../lib/supabase/actions";

// ─── Constants ────────────────────────────────────────────────────────────────

const JOB_TITLES = [
  "Support Worker", "Senior Support Worker", "Team Leader",
  "Deputy Manager", "Registered Manager", "Responsible Individual",
  "Keyworker", "Night Staff",
] as const;
type JobTitle = typeof JOB_TITLES[number];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const roleBadgeColors: Record<string, string> = {
  home_staff:     "bg-blue-50 text-blue-700 ring-1 ring-blue-600/20",
  readonly_staff: "bg-slate-100 text-slate-600 ring-1 ring-slate-200",
  admin:          "bg-purple-50 text-purple-700 ring-1 ring-purple-600/20",
};

function roleDisplayName(role: string): string {
  if (role === "home_staff") return "Home Staff";
  if (role === "readonly_staff") return "Read-only";
  if (role === "admin") return "Admin";
  return role;
}

function initials(name: string): string {
  return name.split(" ").filter(Boolean).map(w => w[0]).join("").toUpperCase().slice(0, 2);
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

// ─── Add Staff modal ──────────────────────────────────────────────────────────

interface AddForm {
  name: string;
  email: string;
  jobTitle: JobTitle | "";
  role: string;
  homeIds: string[];
}

function AddStaffModal({
  onClose,
  onAdd,
  dbHomes,
  dbOrgs,
}: {
  onClose: () => void;
  onAdd: (s: DbStaff) => void;
  dbHomes: DbHome[];
  dbOrgs: DbOrganisation[];
}) {
  const [form, setForm] = useState<AddForm>({
    name: "", email: "", jobTitle: "Support Worker", role: "home_staff", homeIds: [],
  });
  const [errors, setErrors] = useState<{ name?: string; email?: string; homeIds?: string }>({});
  const [submitError, setSubmitError] = useState("");
  const [loading, setLoading] = useState(false);

  function toggleHome(id: string) {
    setForm((f) => ({
      ...f,
      homeIds: f.homeIds.includes(id) ? f.homeIds.filter((x) => x !== id) : [...f.homeIds, id],
    }));
  }

  async function handleSubmit() {
    const e: typeof errors = {};
    if (!form.name.trim())         e.name = "Required";
    if (!form.email.trim())        e.email = "Required";
    if (form.homeIds.length === 0) e.homeIds = "Assign at least one home";
    if (Object.keys(e).length > 0) { setErrors(e); return; }

    setSubmitError("");
    setLoading(true);
    try {
      const result = await inviteStaff({
        full_name: form.name.trim(),
        email: form.email.trim(),
        role: form.role,
        job_title: form.role === "home_staff" ? (form.jobTitle as string) : undefined,
        home_ids: form.homeIds,
      });
      if (result.error) {
        setSubmitError(result.error);
        return;
      }
      const newMember: DbStaff = {
        id: result.id ?? crypto.randomUUID(),
        full_name: form.name.trim(),
        email: form.email.trim(),
        role: form.role,
        job_title: form.role === "home_staff" ? form.jobTitle as string : null,
        organisation_id: null,
        created_at: new Date().toISOString(),
        staff_homes: form.homeIds.map(home_id => ({ home_id })),
      };
      onAdd(newMember);
      onClose();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-semibold text-slate-800">Add Staff Member</h3>
            <p className="text-xs text-slate-400 mt-0.5">Create a new staff account</p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-5 space-y-4 max-h-[65vh] overflow-y-auto">
          {/* Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Full Name</label>
            <input
              type="text" value={form.name}
              onChange={(e) => { setForm({ ...form, name: e.target.value }); setErrors({ ...errors, name: undefined }); }}
              placeholder="e.g. Jane Smith"
              className={`w-full px-3 py-2 text-sm text-slate-700 bg-slate-50 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 ${errors.name ? "border-red-400" : "border-slate-200"}`}
            />
            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Email Address</label>
            <input
              type="email" value={form.email}
              onChange={(e) => { setForm({ ...form, email: e.target.value }); setErrors({ ...errors, email: undefined }); }}
              placeholder="jane@home.org"
              className={`w-full px-3 py-2 text-sm text-slate-700 bg-slate-50 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 ${errors.email ? "border-red-400" : "border-slate-200"}`}
            />
            {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
          </div>

          {/* System Role */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">System Role</label>
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value, jobTitle: e.target.value === "home_staff" ? "Support Worker" : "" })}
              className="w-full px-3 py-2 text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
            >
              <option value="home_staff">Home Staff — full access</option>
              <option value="readonly_staff">Read-only — view only</option>
            </select>
          </div>

          {/* Job Title (home_staff only) */}
          {form.role === "home_staff" && (
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Job Title</label>
              <select
                value={form.jobTitle}
                onChange={(e) => setForm({ ...form, jobTitle: e.target.value as JobTitle })}
                className="w-full px-3 py-2 text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
              >
                {JOB_TITLES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          )}

          {/* Assign to Home(s) */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">
              Assign to Home(s)
            </label>
            <div className={`border rounded-lg overflow-hidden divide-y divide-slate-100 ${errors.homeIds ? "border-red-400" : "border-slate-200"}`}>
              {dbHomes.map((home) => (
                <label key={home.id} className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-slate-50 transition-colors">
                  <input
                    type="checkbox"
                    checked={form.homeIds.includes(home.id)}
                    onChange={() => { toggleHome(home.id); setErrors({ ...errors, homeIds: undefined }); }}
                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <p className="text-sm font-medium text-slate-700">{home.name}</p>
                    <p className="text-xs text-slate-400">{dbOrgs.find(o => o.id === home.organisation_id)?.name ?? ""} · {home.sc_urn ?? ""}</p>
                  </div>
                </label>
              ))}
            </div>
            {errors.homeIds && <p className="text-xs text-red-500 mt-1">{errors.homeIds}</p>}
          </div>
        </div>

        {submitError && (
          <div className="mx-6 mb-3 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600">
            {submitError}
          </div>
        )}
        <div className="flex items-center justify-end gap-3 px-6 py-4 bg-slate-50 border-t border-slate-100">
          <button onClick={onClose} disabled={loading} className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50">
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={loading} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-60 flex items-center gap-2">
            {loading && (
              <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            )}
            {loading ? "Creating…" : "Create Account"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Reset 2FA button (stateful, reused in table + panel) ─────────────────────

function Reset2FAButton({ compact = false }: { compact?: boolean }) {
  const [done, setDone] = useState(false);
  if (compact) {
    return (
      <button
        onClick={(e) => { e.stopPropagation(); setDone(true); }}
        disabled={done}
        className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
          done
            ? "text-emerald-600 bg-emerald-50 cursor-default"
            : "text-amber-600 bg-amber-50 hover:bg-amber-100"
        }`}
      >
        {done ? "2FA Reset" : "Reset 2FA"}
      </button>
    );
  }
  return (
    <button
      onClick={() => setDone(true)}
      disabled={done}
      className={`w-full flex items-center gap-2 px-3 py-2.5 text-sm font-medium border rounded-lg transition-colors ${
        done
          ? "text-emerald-600 bg-emerald-50 border-emerald-200 cursor-default"
          : "text-amber-600 bg-amber-50 border-amber-200 hover:bg-amber-100"
      }`}
    >
      <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
      {done ? "2FA has been reset — user must re-enrol on next sign-in" : "Reset Two-Factor Authentication"}
    </button>
  );
}

// ─── Edit side panel ──────────────────────────────────────────────────────────

function EditPanel({
  member,
  onClose,
  onSave,
  dbHomes,
  dbOrgs,
}: {
  member: DbStaff;
  onClose: () => void;
  onSave: (updated: DbStaff) => void;
  dbHomes: DbHome[];
  dbOrgs: DbOrganisation[];
}) {
  const [form, setForm] = useState({ ...member });

  function toggleHome(id: string) {
    setForm((f) => ({
      ...f,
      staff_homes: f.staff_homes.some(sh => sh.home_id === id)
        ? f.staff_homes.filter(sh => sh.home_id !== id)
        : [...f.staff_homes, { home_id: id }],
    }));
  }

  async function handleSave() {
    const homeIds = form.staff_homes.map(sh => sh.home_id);
    await updateStaff(
      form.id,
      { full_name: form.full_name, email: form.email, role: form.role, job_title: form.job_title ?? undefined },
      homeIds
    );
    onSave(form);
    onClose();
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-slate-900/40" onClick={onClose} />
      <div className="fixed right-0 top-0 bottom-0 z-50 w-96 bg-white border-l border-slate-200 shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-semibold text-slate-800">Edit Staff Member</h3>
            <p className="text-xs text-slate-400 mt-0.5">{member.full_name}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Full Name</label>
            <input type="text" value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              className="w-full px-3 py-2 text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Email Address</label>
            <input type="email" value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full px-3 py-2 text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">System Role</label>
            <select value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              className="w-full px-3 py-2 text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
            >
              <option value="home_staff">Home Staff — full access</option>
              <option value="readonly_staff">Read-only — view only</option>
            </select>
          </div>

          {form.role === "home_staff" && (
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Job Title</label>
              <select value={form.job_title ?? ""}
                onChange={(e) => setForm({ ...form, job_title: e.target.value as JobTitle })}
                className="w-full px-3 py-2 text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
              >
                {JOB_TITLES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Assigned Home(s)</label>
            <div className="border border-slate-200 rounded-lg overflow-hidden divide-y divide-slate-100">
              {dbHomes.map((home) => (
                <label key={home.id} className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-slate-50 transition-colors">
                  <input
                    type="checkbox"
                    checked={form.staff_homes.some(sh => sh.home_id === home.id)}
                    onChange={() => toggleHome(home.id)}
                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <p className="text-sm font-medium text-slate-700">{home.name}</p>
                    <p className="text-xs text-slate-400">{dbOrgs.find(o => o.id === home.organisation_id)?.name ?? ""} · {home.sc_urn ?? ""}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100">
            <p className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wider">Account Actions</p>
            <div className="space-y-2">
              <button className="w-full flex items-center gap-2 px-3 py-2.5 text-sm font-medium text-slate-600 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors">
                <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Send Password Reset Email
              </button>
              <Reset2FAButton />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Save Changes
          </button>
        </div>
      </div>
    </>
  );
}

// ─── Delete confirmation dialog ───────────────────────────────────────────────

function DeleteConfirmDialog({
  member,
  onCancel,
  onConfirm,
}: {
  member: DbStaff;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleDelete() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/staff/${member.id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Failed to remove staff member.");
        setLoading(false);
        return;
      }
      onConfirm();
    } catch {
      setError("An unexpected error occurred.");
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-sm overflow-hidden">
        <div className="px-6 py-5">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-red-100 mx-auto mb-4">
            <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="text-sm font-semibold text-slate-800 text-center">Remove Staff Member</h3>
          <p className="text-sm text-slate-500 text-center mt-2">
            Are you sure you want to remove <span className="font-medium text-slate-700">{member.full_name}</span>? Their account and all home assignments will be permanently deleted.
          </p>
          {error && (
            <p className="mt-3 text-xs text-red-600 text-center bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
          )}
        </div>
        <div className="flex items-center justify-end gap-3 px-6 py-4 bg-slate-50 border-t border-slate-100">
          <button onClick={onCancel} disabled={loading} className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50">
            Cancel
          </button>
          <button onClick={handleDelete} disabled={loading} className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-60 flex items-center gap-2">
            {loading && (
              <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            )}
            {loading ? "Removing…" : "Remove"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props { dbStaff: DbStaff[]; dbHomes: DbHome[]; dbOrgs: DbOrganisation[]; }

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function StaffClient({ dbStaff, dbHomes, dbOrgs }: Props) {
  const [rows, setRows] = useState<DbStaff[]>(dbStaff);
  const [showAdd, setShowAdd] = useState(false);
  const [editingMember, setEditingMember] = useState<DbStaff | null>(null);
  const [deletingMember, setDeletingMember] = useState<DbStaff | null>(null);

  // Filters
  const [filterCompany, setFilterCompany] = useState<string>("");
  const [filterHome, setFilterHome] = useState<string>("");
  const [filterJobTitle, setFilterJobTitle] = useState<string>("");
  const [filterRole, setFilterRole] = useState<string>("");
  const [search, setSearch] = useState("");

  function staffHomeIds(member: DbStaff): string[] {
    return member.staff_homes.map(sh => sh.home_id);
  }

  function staffOrgNames(member: DbStaff): string[] {
    const homeIds = staffHomeIds(member);
    const orgIds = new Set(dbHomes.filter(h => homeIds.includes(h.id)).map(h => h.organisation_id));
    return Array.from(orgIds).map(id => dbOrgs.find(o => o.id === id)?.name ?? "").filter(Boolean);
  }

  function staffHomeNames(member: DbStaff): string[] {
    return staffHomeIds(member).map(id => dbHomes.find(h => h.id === id)?.name ?? "").filter(Boolean);
  }

  function addStaff(s: DbStaff) { setRows(prev => [...prev, s]); }
  function saveStaff(updated: DbStaff) { setRows(prev => prev.map(s => s.id === updated.id ? updated : s)); }
  function confirmDelete(member: DbStaff) { setRows(prev => prev.filter(s => s.id !== member.id)); setDeletingMember(null); }

  const allRows = rows;

  const filteredRows = allRows.filter((member) => {
    if (filterCompany && !staffOrgNames(member).includes(filterCompany)) return false;
    if (filterHome && !staffHomeIds(member).includes(filterHome)) return false;
    if (filterJobTitle && member.job_title !== filterJobTitle) return false;
    if (filterRole && member.role !== filterRole) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!member.full_name.toLowerCase().includes(q) && !member.email.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const hasActiveFilters =
    filterCompany !== "" || filterHome !== "" || filterJobTitle !== "" || filterRole !== "" || search !== "";

  function clearFilters() {
    setFilterCompany("");
    setFilterHome("");
    setFilterJobTitle("");
    setFilterRole("");
    setSearch("");
  }

  const orgNames = dbOrgs.map(o => o.name);
  const selectClass = "px-3 py-1.5 text-sm text-slate-600 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 appearance-none pr-8 cursor-pointer";

  return (
    <>
      {showAdd && <AddStaffModal onClose={() => setShowAdd(false)} onAdd={addStaff} dbHomes={dbHomes} dbOrgs={dbOrgs} />}
      {editingMember && (
        <EditPanel member={editingMember} onClose={() => setEditingMember(null)} onSave={saveStaff} dbHomes={dbHomes} dbOrgs={dbOrgs} />
      )}
      {deletingMember && (
        <DeleteConfirmDialog member={deletingMember} onCancel={() => setDeletingMember(null)} onConfirm={() => confirmDelete(deletingMember)} />
      )}

      <div className="flex-1 flex flex-col">
        {/* Top bar */}
        <header className="flex items-center justify-between px-8 py-5 bg-white border-b border-slate-200">
          <div>
            <h1 className="text-xl font-semibold text-slate-800">Staff</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              {allRows.length} total accounts
            </p>
          </div>
          <button
            onClick={() => setShowAdd(true)}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            + Add Staff
          </button>
        </header>

        {/* Filter bar */}
        <div className="px-8 py-4 bg-white border-b border-slate-100">
          <div className="flex items-center gap-3 flex-wrap">
            {/* Search */}
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name or email…"
                className="pl-9 pr-3 py-1.5 text-sm text-slate-600 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 w-52"
              />
            </div>

            <div className="relative">
              <select value={filterCompany} onChange={(e) => setFilterCompany(e.target.value)} className={selectClass}>
                <option value="">All companies</option>
                {orgNames.map((c) => <option key={c} value={c}>{c}</option>)}
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
              <select value={filterJobTitle} onChange={(e) => setFilterJobTitle(e.target.value)} className={selectClass}>
                <option value="">All job titles</option>
                {JOB_TITLES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
              <svg className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
            </div>

            <div className="relative">
              <select value={filterRole} onChange={(e) => setFilterRole(e.target.value)} className={selectClass}>
                <option value="">All roles</option>
                <option value="home_staff">Home Staff</option>
                <option value="readonly_staff">Read-only</option>
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
              {search && <FilterPill label={`"${search}"`} onRemove={() => setSearch("")} />}
              {filterCompany && <FilterPill label={filterCompany} onRemove={() => setFilterCompany("")} />}
              {filterHome && <FilterPill label={dbHomes.find((h) => h.id === filterHome)?.name ?? ""} onRemove={() => setFilterHome("")} />}
              {filterJobTitle && <FilterPill label={filterJobTitle} onRemove={() => setFilterJobTitle("")} />}
              {filterRole && <FilterPill label={roleDisplayName(filterRole)} onRemove={() => setFilterRole("")} />}
            </div>
          )}
        </div>

        <main className="flex-1 p-8">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Header */}
            <div className="grid grid-cols-[2fr_1.4fr_1.8fr_1.8fr_1.6fr_1fr_1fr] gap-3 px-6 py-3 bg-slate-50 border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <span>Full Name</span>
              <span>Company</span>
              <span>Home(s) Assigned</span>
              <span>Email</span>
              <span>Job Title</span>
              <span>Status</span>
              <span>Actions</span>
            </div>

            <div className="divide-y divide-slate-50">
              {filteredRows.length === 0 ? (
                <p className="text-sm text-slate-400 px-6 py-8 text-center">No staff match the current filters.</p>
              ) : filteredRows.map((member) => {
                const homeNames = staffHomeNames(member);
                const companies = staffOrgNames(member);
                return (
                  <div key={member.id} className="grid grid-cols-[2fr_1.4fr_1.8fr_1.8fr_1.6fr_1fr_1fr] gap-3 px-6 py-4 items-center hover:bg-slate-50/60 transition-colors">
                    {/* Name */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold flex-shrink-0 bg-blue-100 text-blue-700">
                        {initials(member.full_name)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate">{member.full_name}</p>
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${roleBadgeColors[member.role] ?? "bg-slate-100 text-slate-600"}`}>
                          {roleDisplayName(member.role)}
                        </span>
                      </div>
                    </div>

                    {/* Company */}
                    <div className="min-w-0">
                      {companies.map((c) => (
                        <p key={c} className="text-xs text-slate-500 truncate">{c}</p>
                      ))}
                    </div>

                    {/* Home(s) */}
                    <div className="min-w-0">
                      {homeNames.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {homeNames.map((n) => (
                            <span key={n} className="inline-flex items-center px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-xs font-medium truncate max-w-full">
                              {n}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </div>

                    {/* Email */}
                    <p className="text-sm text-slate-600 truncate">{member.email}</p>

                    {/* Job title */}
                    <p className="text-sm text-slate-600">{member.job_title ?? "—"}</p>

                    {/* Status */}
                    <div>
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        Active
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button
                        onClick={() => setEditingMember(member)}
                        className="px-2.5 py-1 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors"
                      >
                        Edit
                      </button>
                      <button className="px-2.5 py-1 text-xs font-medium text-slate-500 bg-slate-50 hover:bg-slate-100 rounded-md transition-colors">
                        Reset PW
                      </button>
                      <Reset2FAButton compact />
                      <button
                        onClick={() => setDeletingMember(member)}
                        className="px-2.5 py-1 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-md transition-colors"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <p className="text-sm text-slate-400 mt-4">
            Showing {filteredRows.length} of {allRows.length} staff accounts
          </p>
        </main>
      </div>
    </>
  );
}
