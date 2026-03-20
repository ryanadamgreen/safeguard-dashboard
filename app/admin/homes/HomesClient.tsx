"use client";

import { useState } from "react";
import { DbHome, DbOrganisation } from "../../lib/supabase/queries";
import { createHome, updateHome } from "../../lib/supabase/actions";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AddHomeForm {
  name: string;
  organisationId: string;
  sc_urn: string;
  address: string;
  phone: string;
  email: string;
  responsible_individual: string;
}

const emptyForm: AddHomeForm = {
  name: "", organisationId: "", sc_urn: "", address: "", phone: "", email: "", responsible_individual: "",
};

// ─── Add Home Modal ───────────────────────────────────────────────────────────

function AddHomeModal({
  onClose,
  onAdd,
  dbOrgs,
}: {
  onClose: () => void;
  onAdd: (form: AddHomeForm) => void;
  dbOrgs: DbOrganisation[];
}) {
  const [form, setForm] = useState<AddHomeForm>(emptyForm);
  const [errors, setErrors] = useState<Partial<Record<keyof AddHomeForm, string>>>({});

  function validate() {
    const e: Partial<Record<keyof AddHomeForm, string>> = {};
    if (!form.name.trim())                       e.name = "Required";
    if (!form.organisationId)                    e.organisationId = "Required";
    if (!form.sc_urn.trim())                     e.sc_urn = "Required";
    if (!form.address.trim())                    e.address = "Required";
    if (!form.responsible_individual.trim())     e.responsible_individual = "Required";
    return e;
  }

  function handleSubmit() {
    const e = validate();
    if (Object.keys(e).length > 0) { setErrors(e); return; }
    onAdd(form);
    onClose();
  }

  const inputClass = (key: keyof AddHomeForm) =>
    `w-full px-3 py-2 text-sm text-slate-700 bg-slate-50 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 ${errors[key] ? "border-red-400" : "border-slate-200"}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-semibold text-slate-800">Add New Home</h3>
            <p className="text-xs text-slate-400 mt-0.5">Register a new residential home</p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-5 space-y-4 max-h-[60vh] overflow-y-auto">
          {/* Home Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Home Name</label>
            <input type="text" value={form.name} placeholder="e.g. Birchwood House"
              onChange={(e) => { setForm({ ...form, name: e.target.value }); setErrors({ ...errors, name: undefined }); }}
              className={inputClass("name")} />
            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
          </div>

          {/* Company */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Company</label>
            <div className="relative">
              <select value={form.organisationId}
                onChange={(e) => { setForm({ ...form, organisationId: e.target.value }); setErrors({ ...errors, organisationId: undefined }); }}
                className={`${inputClass("organisationId")} appearance-none pr-8`}>
                <option value="">Select company…</option>
                {dbOrgs.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
              <svg className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
            </div>
            {errors.organisationId && <p className="text-xs text-red-500 mt-1">{errors.organisationId}</p>}
          </div>

          {/* SC/URN */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">SC/URN</label>
            <input type="text" value={form.sc_urn} placeholder="e.g. SC789012"
              onChange={(e) => { setForm({ ...form, sc_urn: e.target.value }); setErrors({ ...errors, sc_urn: undefined }); }}
              className={inputClass("sc_urn")} />
            {errors.sc_urn && <p className="text-xs text-red-500 mt-1">{errors.sc_urn}</p>}
          </div>

          {/* Address */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Address</label>
            <input type="text" value={form.address} placeholder="e.g. 34 High St, Leeds, LS1 1AB"
              onChange={(e) => { setForm({ ...form, address: e.target.value }); setErrors({ ...errors, address: undefined }); }}
              className={inputClass("address")} />
            {errors.address && <p className="text-xs text-red-500 mt-1">{errors.address}</p>}
          </div>

          {/* Phone */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Phone</label>
            <input type="tel" value={form.phone} placeholder="+44 113 000 0000"
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className={inputClass("phone")} />
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Email</label>
            <input type="email" value={form.email} placeholder="admin@home.org"
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className={inputClass("email")} />
          </div>

          {/* Responsible Individual */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Responsible Individual</label>
            <input type="text" value={form.responsible_individual} placeholder="Full name"
              onChange={(e) => { setForm({ ...form, responsible_individual: e.target.value }); setErrors({ ...errors, responsible_individual: undefined }); }}
              className={inputClass("responsible_individual")} />
            {errors.responsible_individual && <p className="text-xs text-red-500 mt-1">{errors.responsible_individual}</p>}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 bg-slate-50 border-t border-slate-100">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
            Cancel
          </button>
          <button onClick={handleSubmit} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors">
            Add Home
          </button>
        </div>
      </div>
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

interface Props { dbHomes: DbHome[]; dbOrgs: DbOrganisation[]; }

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function HomesClient({ dbHomes, dbOrgs }: Props) {
  const [rows, setRows] = useState<DbHome[]>(dbHomes);
  const [showAddHome, setShowAddHome] = useState(false);

  const orgName = (home: DbHome) => dbOrgs.find(o => o.id === home.organisation_id)?.name ?? "—";
  const orgNames = dbOrgs.map(o => o.name);

  // Filters
  const [filterCompany, setFilterCompany] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<"active" | "inactive" | "">("");
  const [search, setSearch] = useState("");

  function toggleStatus(id: string) {
    setRows((prev) =>
      prev.map((h) => h.id === id ? { ...h, status: h.status === "active" ? "inactive" : "active" } : h)
    );
    const home = rows.find(h => h.id === id);
    if (home) {
      updateHome(id, { status: home.status === "active" ? "inactive" : "active" });
    }
  }

  function addHome(form: AddHomeForm) {
    // Optimistic update
    const tempId = crypto.randomUUID();
    const newRow: DbHome = {
      id: tempId,
      organisation_id: form.organisationId,
      name: form.name,
      sc_urn: form.sc_urn || null,
      address: form.address || null,
      phone: form.phone || null,
      email: form.email || null,
      responsible_individual: form.responsible_individual || null,
      status: "active",
      created_at: new Date().toISOString(),
    };
    setRows((prev) => [...prev, newRow]);
    // Persist in background
    createHome({
      name: form.name,
      organisation_id: form.organisationId,
      sc_urn: form.sc_urn || undefined,
      address: form.address || undefined,
      phone: form.phone || undefined,
      email: form.email || undefined,
      responsible_individual: form.responsible_individual || undefined,
    });
  }

  const filteredRows = rows.filter((h) => {
    if (filterCompany && orgName(h) !== filterCompany) return false;
    if (filterStatus && h.status !== filterStatus) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!h.name.toLowerCase().includes(q) && !(h.sc_urn ?? "").toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const hasActiveFilters = filterCompany !== "" || filterStatus !== "" || search !== "";

  function clearFilters() {
    setFilterCompany("");
    setFilterStatus("");
    setSearch("");
  }

  const selectClass = "px-3 py-1.5 text-sm text-slate-600 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 appearance-none pr-8 cursor-pointer";

  return (
    <>
      {showAddHome && <AddHomeModal onClose={() => setShowAddHome(false)} onAdd={addHome} dbOrgs={dbOrgs} />}

      <div className="flex-1 flex flex-col">
        {/* Top bar */}
        <header className="flex items-center justify-between px-8 py-5 bg-white border-b border-slate-200">
          <div>
            <h1 className="text-xl font-semibold text-slate-800">Homes</h1>
            <p className="text-sm text-slate-500 mt-0.5">{rows.length} registered homes</p>
          </div>
          <button
            onClick={() => setShowAddHome(true)}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            + Add Home
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
                placeholder="Search by name or SC/URN…"
                className="pl-9 pr-3 py-1.5 text-sm text-slate-600 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 w-56"
              />
            </div>

            <div className="relative">
              <select value={filterCompany} onChange={(e) => setFilterCompany(e.target.value)} className={selectClass}>
                <option value="">All companies</option>
                {orgNames.map((n) => <option key={n} value={n}>{n}</option>)}
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
              {search && <FilterPill label={`"${search}"`} onRemove={() => setSearch("")} />}
              {filterCompany && <FilterPill label={filterCompany} onRemove={() => setFilterCompany("")} />}
              {filterStatus && <FilterPill label={filterStatus === "active" ? "Active" : "Inactive"} onRemove={() => setFilterStatus("")} />}
            </div>
          )}
        </div>

        <main className="flex-1 p-8">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Table header */}
            <div className="grid grid-cols-[1.6fr_1.4fr_1fr_1.6fr_1.6fr_0.6fr_0.6fr_1fr_1.1fr] gap-3 px-6 py-3 bg-slate-50 border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <span>Home Name</span>
              <span>Company</span>
              <span>SC/URN</span>
              <span>Address</span>
              <span>Responsible Individual</span>
              <span>Children</span>
              <span>Staff</span>
              <span>Status</span>
              <span>Actions</span>
            </div>

            <div className="divide-y divide-slate-50">
              {filteredRows.length === 0 ? (
                <p className="text-sm text-slate-400 px-6 py-8 text-center">No homes match the current filters.</p>
              ) : filteredRows.map((home) => (
                <div
                  key={home.id}
                  className="grid grid-cols-[1.6fr_1.4fr_1fr_1.6fr_1.6fr_0.6fr_0.6fr_1fr_1.1fr] gap-3 px-6 py-4 items-center hover:bg-slate-50/60 transition-colors"
                >
                  {/* Home name */}
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{home.name}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{home.email ?? ""}</p>
                  </div>

                  {/* Company */}
                  <p className="text-sm text-slate-600 truncate">{orgName(home)}</p>

                  {/* SC/URN */}
                  <p className="text-sm font-mono text-slate-600">{home.sc_urn ?? "—"}</p>

                  {/* Address */}
                  <p className="text-sm text-slate-600 truncate">{home.address ?? "—"}</p>

                  {/* RI */}
                  <p className="text-sm text-slate-700 font-medium">{home.responsible_individual ?? "—"}</p>

                  {/* Children */}
                  <p className="text-sm font-medium text-slate-700">0</p>

                  {/* Staff */}
                  <p className="text-sm font-medium text-slate-700">0</p>

                  {/* Status badge */}
                  <div>
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                      home.status === "active"
                        ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20"
                        : "bg-red-50 text-red-700 ring-1 ring-red-600/20"
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${home.status === "active" ? "bg-emerald-500" : "bg-red-500"}`} />
                      {home.status === "active" ? "Active" : "Inactive"}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleStatus(home.id)}
                      className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                        home.status === "active"
                          ? "text-red-600 bg-red-50 hover:bg-red-100"
                          : "text-emerald-600 bg-emerald-50 hover:bg-emerald-100"
                      }`}
                    >
                      {home.status === "active" ? "Deactivate" : "Activate"}
                    </button>
                    <button className="px-2.5 py-1 rounded-md text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors">
                      Edit
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <p className="text-sm text-slate-400 mt-4">
            Showing {filteredRows.length} of {rows.length} homes
          </p>
        </main>
      </div>
    </>
  );
}
