"use client";

import { useState, useEffect } from "react";
import { type DbOrganisation, type DbHome, type DbStaff } from "../../lib/supabase/queries";

// ─── Local constants ──────────────────────────────────────────────────────────

const PRICE_PER_HOME_GBP = 150;
const VAT_RATE = 0.2;
type BillingStatus = "active" | "trialing" | "past_due" | "canceled" | "inactive" | "unpaid";

function getTrialDaysRemaining(iso: string): number {
  return Math.ceil((new Date(iso).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

function trialEndDate(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface Organisation {
  id: string;
  name: string;
  contactName: string;
  contactEmail: string;
  phone: string;
  address: string;
  createdDate: string;
}

interface OrgBillingRow {
  subscriptionStatus: BillingStatus;
  trialEndsAt?: string;
  homeCount: number;
  failedPayment: boolean;
  currentPeriodEnd?: string;
  stripeCustomerId?: string;
  paymentLinkSentAt?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

const billingStatusConfig: Record<
  BillingStatus,
  { label: string; classes: string; dot: string }
> = {
  active:   { label: "Active",     classes: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20", dot: "bg-emerald-500" },
  trialing: { label: "Trial",      classes: "bg-blue-50 text-blue-700 ring-1 ring-blue-600/20",           dot: "bg-blue-500"    },
  past_due: { label: "Past Due",   classes: "bg-red-50 text-red-700 ring-1 ring-red-600/20",              dot: "bg-red-500"     },
  unpaid:   { label: "Unpaid",     classes: "bg-red-50 text-red-700 ring-1 ring-red-600/20",              dot: "bg-red-500"     },
  canceled: { label: "Cancelled",  classes: "bg-slate-100 text-slate-500 ring-1 ring-slate-200",          dot: "bg-slate-400"   },
  inactive: { label: "Not set up", classes: "bg-slate-100 text-slate-500 ring-1 ring-slate-200",          dot: "bg-slate-300"   },
};

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

// ─── Add Organisation modal ───────────────────────────────────────────────────

interface OrgForm {
  name: string;
  contactName: string;
  contactEmail: string;
  phone: string;
  address: string;
  startOnTrial: boolean;
  trialDays: number;
  customTrialDays: string;
  trialLengthOption: "14" | "30" | "60" | "custom";
}

const emptyOrgForm: OrgForm = {
  name: "",
  contactName: "",
  contactEmail: "",
  phone: "",
  address: "",
  startOnTrial: true,
  trialDays: 30,
  customTrialDays: "",
  trialLengthOption: "30",
};

function AddOrgModal({
  onClose,
  onAdd,
}: {
  onClose: () => void;
  onAdd: (f: OrgForm) => Promise<{ error?: string }>;
}) {
  const [form, setForm] = useState<OrgForm>(emptyOrgForm);
  const [errors, setErrors] = useState<Partial<Record<keyof OrgForm, string>>>({});
  const [submitError, setSubmitError] = useState("");
  const [loading, setLoading] = useState(false);

  function validate() {
    const e: typeof errors = {};
    if (!form.name.trim()) e.name = "Required";
    if (!form.contactName.trim()) e.contactName = "Required";
    if (!form.contactEmail.trim()) e.contactEmail = "Required";
    if (form.startOnTrial && form.trialLengthOption === "custom") {
      const n = parseInt(form.customTrialDays, 10);
      if (isNaN(n) || n < 1 || n > 365) e.customTrialDays = "Enter a value between 1 and 365";
    }
    return e;
  }

  function setTrialOption(opt: OrgForm["trialLengthOption"]) {
    const days = opt === "14" ? 14 : opt === "30" ? 30 : opt === "60" ? 60 : parseInt(form.customTrialDays, 10) || 30;
    setForm({ ...form, trialLengthOption: opt, trialDays: days });
  }

  async function handleSubmit() {
    const e = validate();
    if (Object.keys(e).length > 0) { setErrors(e); return; }
    setSubmitError("");
    setLoading(true);
    const resolvedDays = form.trialLengthOption === "custom"
      ? parseInt(form.customTrialDays, 10)
      : form.trialDays;
    try {
      const result = await onAdd({ ...form, trialDays: resolvedDays });
      if (result?.error) {
        setSubmitError(result.error);
      } else {
        onClose();
      }
    } finally {
      setLoading(false);
    }
  }

  const inputClass = (key: keyof OrgForm) =>
    `w-full px-3 py-2 text-sm text-slate-700 bg-slate-50 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 ${errors[key] ? "border-red-400" : "border-slate-200"}`;

  const trialOptions: { value: OrgForm["trialLengthOption"]; label: string }[] = [
    { value: "14", label: "14 days" },
    { value: "30", label: "30 days" },
    { value: "60", label: "60 days" },
    { value: "custom", label: "Custom" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-semibold text-slate-800">Add Organisation</h3>
            <p className="text-xs text-slate-400 mt-0.5">A Stripe customer will be created automatically</p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-5 space-y-4 max-h-[65vh] overflow-y-auto">
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Company Name</label>
            <input type="text" value={form.name} placeholder="e.g. Sunrise Care Group"
              onChange={(e) => { setForm({ ...form, name: e.target.value }); setErrors({ ...errors, name: undefined }); }}
              className={inputClass("name")} />
            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Primary Contact Name</label>
            <input type="text" value={form.contactName} placeholder="e.g. Jane Smith"
              onChange={(e) => { setForm({ ...form, contactName: e.target.value }); setErrors({ ...errors, contactName: undefined }); }}
              className={inputClass("contactName")} />
            {errors.contactName && <p className="text-xs text-red-500 mt-1">{errors.contactName}</p>}
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Email</label>
            <input type="email" value={form.contactEmail} placeholder="contact@organisation.co.uk"
              onChange={(e) => { setForm({ ...form, contactEmail: e.target.value }); setErrors({ ...errors, contactEmail: undefined }); }}
              className={inputClass("contactEmail")} />
            {errors.contactEmail && <p className="text-xs text-red-500 mt-1">{errors.contactEmail}</p>}
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Phone</label>
            <input type="tel" value={form.phone} placeholder="+44 121 000 0000"
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className={inputClass("phone")} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Address</label>
            <input type="text" value={form.address} placeholder="e.g. 10 Business Park, City, AB1 2CD"
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              className={inputClass("address")} />
          </div>

          {/* Trial toggle */}
          <div className="border border-slate-200 rounded-lg p-4 bg-slate-50/60">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm font-semibold text-slate-700">Start on free trial</p>
                <p className="text-xs text-slate-400 mt-0.5">Full access with no billing required during trial</p>
              </div>
              <button
                type="button"
                onClick={() => setForm({ ...form, startOnTrial: !form.startOnTrial })}
                className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
                  form.startOnTrial ? "bg-blue-600" : "bg-slate-200"
                }`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 ${
                  form.startOnTrial ? "translate-x-4" : "translate-x-0"
                }`} />
              </button>
            </div>

            {form.startOnTrial && (
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Trial length</p>
                <div className="flex gap-2 flex-wrap">
                  {trialOptions.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setTrialOption(opt.value)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                        form.trialLengthOption === opt.value
                          ? "bg-blue-600 text-white border-blue-600"
                          : "bg-white text-slate-600 border-slate-200 hover:border-blue-300"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                {form.trialLengthOption === "custom" && (
                  <div className="mt-2 flex items-center gap-2">
                    <input
                      type="number"
                      min="1"
                      max="365"
                      placeholder="e.g. 45"
                      value={form.customTrialDays}
                      onChange={(e) => setForm({ ...form, customTrialDays: e.target.value })}
                      className="w-24 px-3 py-1.5 text-sm text-slate-700 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
                    />
                    <span className="text-xs text-slate-500">days</span>
                    {errors.customTrialDays && <p className="text-xs text-red-500">{errors.customTrialDays}</p>}
                  </div>
                )}
                <p className="text-xs text-blue-600 mt-2 font-medium">
                  Trial expires: {formatDate(trialEndDate(
                    form.trialLengthOption === "custom"
                      ? (parseInt(form.customTrialDays, 10) || 30)
                      : form.trialDays
                  ))}
                </p>
              </div>
            )}

            {!form.startOnTrial && (
              <p className="text-xs text-slate-500">
                Billing will be set up after creation via Stripe checkout.
              </p>
            )}
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
          <button onClick={handleSubmit} disabled={loading}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-60 flex items-center gap-2">
            {loading && (
              <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            )}
            {loading ? "Creating…" : "Add Organisation"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Extend Trial modal ───────────────────────────────────────────────────────

function ExtendTrialModal({
  org,
  currentExpiry,
  onClose,
  onExtend,
}: {
  org: Organisation;
  currentExpiry: string;
  onClose: () => void;
  onExtend: (newDate: string) => void;
}) {
  const [newDate, setNewDate] = useState(currentExpiry);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-semibold text-slate-800">Extend Trial</h3>
            <p className="text-xs text-slate-400 mt-0.5">{org.name}</p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">
              Current expiry
            </label>
            <p className="text-sm font-medium text-slate-700">{formatDate(currentExpiry)}</p>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">
              New expiry date
            </label>
            <input
              type="date"
              value={newDate}
              min={currentExpiry}
              onChange={(e) => setNewDate(e.target.value)}
              className="w-full px-3 py-2 text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
            />
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 px-6 py-4 bg-slate-50 border-t border-slate-100">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
            Cancel
          </button>
          <button
            onClick={() => { onExtend(newDate); onClose(); }}
            disabled={!newDate || newDate <= currentExpiry}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            Extend Trial
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Send Payment Link modal ──────────────────────────────────────────────────

const IS_DEV = process.env.NODE_ENV === "development";

function SendPaymentLinkModal({
  org,
  homeCount,
  isResend,
  onClose,
  onSend,
}: {
  org: Organisation;
  homeCount: number;
  isResend: boolean;
  onClose: () => void;
  onSend: (toEmail: string, ccEmails: string[]) => Promise<void>;
}) {
  const [toEmail, setToEmail] = useState(org.contactEmail);
  const [cc, setCc] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const netMonthly = homeCount * 150;
  const vatAmount = (netMonthly * 0.2).toFixed(2);
  const grossMonthly = (netMonthly * 1.2).toFixed(2);

  const parsedCc = cc
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);

  async function handleSend() {
    setLoading(true);
    setError(null);
    try {
      await onSend(toEmail.trim(), parsedCc);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send payment link");
      setLoading(false);
    }
  }

  const title = isResend ? "Resend Payment Link" : "Send Payment Link";
  const inputClass = "w-full px-3 py-2 text-sm text-slate-700 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
            <p className="text-xs text-slate-400 mt-0.5">{org.name}</p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Dev mode notice */}
          {IS_DEV && (
            <div className="flex items-start gap-2.5 px-3 py-3 bg-blue-50 border border-blue-200 rounded-lg">
              <svg className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
              </svg>
              <p className="text-xs text-blue-700">
                <span className="font-semibold">Test mode:</span> Resend will only deliver to rgmediaukltd@gmail.com until a domain is verified. The payment link will still be generated correctly.
              </p>
            </div>
          )}

          {/* To field */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Send to</label>
            <input
              type="email"
              value={toEmail}
              onChange={(e) => setToEmail(e.target.value)}
              className={inputClass}
            />
            <p className="text-xs text-slate-400 mt-1">Edit if sending to a different contact</p>
          </div>

          {/* CC field */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">CC (optional)</label>
            <input
              type="text"
              value={cc}
              onChange={(e) => setCc(e.target.value)}
              placeholder="e.g. manager@company.com, accounts@company.com"
              className={inputClass}
            />
          </div>

          {/* Price summary */}
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Monthly charge</p>
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <div className="px-4 py-3 space-y-1.5 text-sm bg-slate-50">
                <div className="flex justify-between text-slate-600">
                  <span>{homeCount} home{homeCount !== 1 ? "s" : ""} × £150/month</span>
                  <span className="font-medium">£{netMonthly}.00</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>VAT (20%)</span>
                  <span>£{vatAmount}</span>
                </div>
                <div className="flex justify-between font-semibold text-slate-800 pt-1.5 border-t border-slate-200">
                  <span>Total per month</span>
                  <span>£{grossMonthly}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Info note */}
          <div className="flex items-start gap-2 text-xs text-slate-500">
            <svg className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
            </svg>
            <span>The customer will receive a Stripe checkout link valid for 24 hours. They can pay by card or BACS Direct Debit.</span>
          </div>

          {error && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 bg-slate-50 border-t border-slate-100">
          <button onClick={onClose} disabled={loading} className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50">
            Cancel
          </button>
          <button onClick={handleSend} disabled={loading || !toEmail.trim()}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-60">
            {loading ? (
              <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            ) : (
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
              </svg>
            )}
            {loading ? "Sending…" : isResend ? "Resend Link →" : "Send Payment Link →"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Edit side panel ──────────────────────────────────────────────────────────

function EditPanel({
  org,
  onClose,
  onSave,
}: {
  org: Organisation;
  onClose: () => void;
  onSave: (updated: Organisation) => void;
}) {
  const [form, setForm] = useState({ ...org });
  const inputClass = "w-full px-3 py-2 text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400";

  return (
    <>
      <div className="fixed inset-0 z-40 bg-slate-900/40" onClick={onClose} />
      <div className="fixed right-0 top-0 bottom-0 z-50 w-96 bg-white border-l border-slate-200 shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-semibold text-slate-800">Edit Organisation</h3>
            <p className="text-xs text-slate-400 mt-0.5">{org.name}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {(
            [
              { key: "name" as const,          label: "Company Name",         type: "text"  },
              { key: "contactName" as const,   label: "Primary Contact Name", type: "text"  },
              { key: "contactEmail" as const,  label: "Email",                type: "email" },
              { key: "phone" as const,         label: "Phone",                type: "tel"   },
              { key: "address" as const,       label: "Address",              type: "text"  },
            ] as const
          ).map(({ key, label, type }) => (
            <div key={key}>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">{label}</label>
              <input type={type} value={form[key]}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                className={inputClass} />
            </div>
          ))}
        </div>
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">Cancel</button>
          <button onClick={() => { onSave(form); onClose(); }} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors">Save Changes</button>
        </div>
      </div>
    </>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface OrganisationsClientProps {
  dbOrgs: DbOrganisation[];
  dbHomes: DbHome[];
  dbStaff: DbStaff[];
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function OrganisationsClient({ dbOrgs, dbHomes, dbStaff }: OrganisationsClientProps) {
  // Map DbOrganisation to local Organisation shape
  const initialOrgs: Organisation[] = dbOrgs.map(o => ({
    id: o.id,
    name: o.name,
    contactName: o.primary_contact_name ?? "",
    contactEmail: o.primary_contact_email ?? "",
    phone: o.phone ?? "",
    address: o.address ?? "",
    createdDate: o.created_at,
  }));

  function getOrgBillingRow(orgId: string): OrgBillingRow | null {
    const org = dbOrgs.find(o => o.id === orgId);
    if (!org) return null;
    const homeCount = dbHomes.filter(h => h.organisation_id === orgId).length;
    return {
      subscriptionStatus: (org.subscription_status ?? "inactive") as BillingStatus,
      trialEndsAt: org.trial_expires_at ?? undefined,
      homeCount,
      failedPayment: false,
      currentPeriodEnd: undefined,
      stripeCustomerId: org.stripe_customer_id ?? undefined,
      paymentLinkSentAt: undefined,
    };
  }

  const [orgs, setOrgs] = useState<Organisation[]>(initialOrgs);
  // Local billing overrides (for extend trial / payment link sent state)
  const [billingOverrides, setBillingOverrides] = useState<Record<string, Partial<OrgBillingRow>>>({});
  const [showAdd, setShowAdd] = useState(false);
  const [editingOrg, setEditingOrg] = useState<Organisation | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [extendTrialOrg, setExtendTrialOrg] = useState<Organisation | null>(null);
  const [sendLinkOrg, setSendLinkOrg] = useState<Organisation | null>(null);
  const [sendLinkIsResend, setSendLinkIsResend] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  useEffect(() => {
    if (!successToast) return;
    const t = setTimeout(() => setSuccessToast(null), 4000);
    return () => clearTimeout(t);
  }, [successToast]);

  // Filters
  const [filterStatus, setFilterStatus] = useState<BillingStatus | "">("");
  const [search, setSearch] = useState("");

  function getBilling(orgId: string): OrgBillingRow {
    const base = getOrgBillingRow(orgId) ?? {
      subscriptionStatus: "inactive" as BillingStatus,
      homeCount: 0,
      failedPayment: false,
    };
    return { ...base, ...(billingOverrides[orgId] ?? {}) };
  }

  async function addOrg(f: OrgForm): Promise<{ error?: string }> {
    // 1. Create Stripe customer (best-effort — don't block on failure)
    let stripeCustomerId: string | undefined;
    try {
      const res = await fetch("/api/stripe/create-customer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgName: f.name, email: f.contactEmail, address: f.address || undefined }),
      });
      const json = (await res.json()) as { customerId?: string; error?: string };
      if (json.customerId) stripeCustomerId = json.customerId;
      else console.warn("[addOrg] Stripe customer creation failed:", json.error);
    } catch (err) {
      console.warn("[addOrg] Could not reach Stripe API:", err);
    }

    // 2. Persist to database
    const res = await fetch("/api/organisations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: f.name,
        primary_contact_name: f.contactName,
        primary_contact_email: f.contactEmail,
        phone: f.phone || undefined,
        address: f.address || undefined,
        subscription_status: f.startOnTrial ? "trialing" : "inactive",
        trial_days: f.startOnTrial ? f.trialDays : undefined,
        stripe_customer_id: stripeCustomerId,
      }),
    });

    const json = (await res.json()) as { org?: { id: string }; error?: string };

    if (!res.ok || !json.org) {
      console.error("[addOrg] insert failed:", json.error);
      return { error: json.error ?? "Failed to create organisation. Please try again." };
    }

    const newId = json.org.id;

    // 3. Update local state with the real DB id
    setBillingOverrides(prev => ({
      ...prev,
      [newId]: {
        subscriptionStatus: f.startOnTrial ? "trialing" : "inactive",
        homeCount: 0,
        trialEndsAt: f.startOnTrial ? trialEndDate(f.trialDays) : undefined,
        stripeCustomerId,
        failedPayment: false,
      },
    }));

    setOrgs((prev) => [
      ...prev,
      {
        id: newId,
        name: f.name,
        contactName: f.contactName,
        contactEmail: f.contactEmail,
        phone: f.phone,
        address: f.address,
        createdDate: new Date().toISOString().slice(0, 10),
      },
    ]);

    return {};
  }

  async function sendPaymentLink(org: Organisation, toEmail: string, ccEmails: string[]): Promise<void> {
    const b = getBilling(org.id);
    const homeCount = b.homeCount || 1;

    const res = await fetch("/api/stripe/send-payment-link", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orgId: org.id,
        orgName: org.name,
        orgEmail: org.contactEmail,
        toEmail,
        cc: ccEmails.length > 0 ? ccEmails : undefined,
        orgAddress: org.address || undefined,
        homeCount,
        existingCustomerId: b.stripeCustomerId,
      }),
    });

    const json = (await res.json()) as { customerId?: string; sentTo?: string; error?: string };
    if (!json.customerId) throw new Error(json.error ?? "Failed to send payment link");

    setBillingOverrides(prev => ({
      ...prev,
      [org.id]: {
        ...(prev[org.id] ?? {}),
        stripeCustomerId: json.customerId,
        paymentLinkSentAt: new Date().toISOString().slice(0, 10),
      },
    }));
    setSuccessToast(`Payment link sent to ${json.sentTo}`);
  }

  function extendTrial(orgId: string, newDate: string) {
    setBillingOverrides(prev => ({
      ...prev,
      [orgId]: { ...(prev[orgId] ?? {}), trialEndsAt: newDate },
    }));
  }

  const filtered = orgs.filter((o) => {
    const b = getBilling(o.id);
    if (filterStatus && (b.subscriptionStatus ?? "inactive") !== filterStatus) return false;
    if (search && !o.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const hasActiveFilters = filterStatus !== "" || search !== "";
  const selectClass = "px-3 py-1.5 text-sm text-slate-600 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 appearance-none pr-8 cursor-pointer";

  return (
    <>
      {showAdd && (
        <AddOrgModal onClose={() => setShowAdd(false)} onAdd={addOrg} />
      )}
      {editingOrg && (
        <EditPanel
          org={editingOrg}
          onClose={() => setEditingOrg(null)}
          onSave={(updated) => setOrgs((prev) => prev.map((o) => o.id === updated.id ? updated : o))}
        />
      )}
      {extendTrialOrg && getBilling(extendTrialOrg.id)?.trialEndsAt && (
        <ExtendTrialModal
          org={extendTrialOrg}
          currentExpiry={getBilling(extendTrialOrg.id).trialEndsAt!}
          onClose={() => setExtendTrialOrg(null)}
          onExtend={(newDate) => extendTrial(extendTrialOrg.id, newDate)}
        />
      )}
      {sendLinkOrg && (
        <SendPaymentLinkModal
          org={sendLinkOrg}
          homeCount={getBilling(sendLinkOrg.id).homeCount || 1}
          isResend={sendLinkIsResend}
          onClose={() => setSendLinkOrg(null)}
          onSend={(toEmail, ccEmails) => sendPaymentLink(sendLinkOrg, toEmail, ccEmails)}
        />
      )}

      <div className="flex-1 flex flex-col">
        {/* Top bar */}
        <header className="flex items-center justify-between px-8 py-5 bg-white border-b border-slate-200">
          <div>
            <h1 className="text-xl font-semibold text-slate-800">Organisations</h1>
            <p className="text-sm text-slate-500 mt-0.5">{orgs.length} registered organisations</p>
          </div>
          <button
            onClick={() => setShowAdd(true)}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            + Add Organisation
          </button>
        </header>

        {/* Success toast */}
        {successToast && (
          <div className="mx-8 mt-4 flex items-center gap-3 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-lg">
            <svg className="w-4 h-4 text-emerald-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            <p className="text-sm text-emerald-700 flex-1">{successToast}</p>
            <button onClick={() => setSuccessToast(null)} className="text-emerald-400 hover:text-emerald-600 transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Filter bar */}
        <div className="px-8 py-4 bg-white border-b border-slate-100">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by company name…"
                className="pl-9 pr-3 py-1.5 text-sm text-slate-600 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 w-56" />
            </div>
            <div className="relative">
              <select value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as BillingStatus | "")}
                className={selectClass}>
                <option value="">All statuses</option>
                <option value="active">Active</option>
                <option value="trialing">Trial</option>
                <option value="past_due">Past Due</option>
                <option value="inactive">Not set up</option>
                <option value="canceled">Cancelled</option>
              </select>
              <svg className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
            </div>
            {hasActiveFilters && (
              <button onClick={() => { setFilterStatus(""); setSearch(""); }}
                className="px-3 py-1.5 text-xs font-medium text-slate-500 hover:text-slate-700 transition-colors">
                Clear all
              </button>
            )}
          </div>
          {hasActiveFilters && (
            <div className="flex items-center gap-2 mt-3 flex-wrap">
              {search && <FilterPill label={`"${search}"`} onRemove={() => setSearch("")} />}
              {filterStatus && <FilterPill label={billingStatusConfig[filterStatus]?.label ?? filterStatus} onRemove={() => setFilterStatus("")} />}
            </div>
          )}
        </div>

        <main className="flex-1 p-8">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Table header */}
            <div className="grid grid-cols-[2fr_1.8fr_1.8fr_1fr_0.7fr_0.7fr_1.6fr_1.6fr] gap-3 px-6 py-3 bg-slate-50 border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <span>Company</span>
              <span>Primary Contact</span>
              <span>Email</span>
              <span>Phone</span>
              <span>Homes</span>
              <span>Staff</span>
              <span>Subscription</span>
              <span>Actions</span>
            </div>

            <div className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <p className="text-sm text-slate-400 px-6 py-8 text-center">No organisations match the current filters.</p>
              ) : filtered.map((org) => {
                const orgHomes = dbHomes.filter(h => h.organisation_id === org.id);
                const staffCount = dbStaff.filter(s => s.organisation_id === org.id).length;
                const isExpanded = expandedId === org.id;
                const b = getBilling(org.id);
                const bStatus = b.subscriptionStatus ?? "inactive";
                const sc = billingStatusConfig[bStatus];
                const netMonthly = orgHomes.length * PRICE_PER_HOME_GBP;
                const grossMonthly = netMonthly * (1 + VAT_RATE);
                const isTrialing = bStatus === "trialing";
                const daysRemaining = (isTrialing && b.trialEndsAt)
                  ? getTrialDaysRemaining(b.trialEndsAt)
                  : null;
                const isExpiringSoon = daysRemaining !== null && daysRemaining <= 7 && daysRemaining > 0;
                const isExpired = daysRemaining !== null && daysRemaining <= 0;
                const paymentLinkSentAt = b.paymentLinkSentAt;
                const isAwaitingPayment = !!paymentLinkSentAt;

                return (
                  <div key={org.id}>
                    <div className="grid grid-cols-[2fr_1.8fr_1.8fr_1fr_0.7fr_0.7fr_1.6fr_1.6fr] gap-3 px-6 py-4 items-center hover:bg-slate-50/60 transition-colors">
                      {/* Company name + expand toggle */}
                      <div className="flex items-center gap-2 min-w-0">
                        <button
                          onClick={() => setExpandedId(isExpanded ? null : org.id)}
                          className="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                        >
                          <svg className={`w-3.5 h-3.5 transition-transform ${isExpanded ? "rotate-90" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-800 truncate">{org.name}</p>
                          <p className="text-xs text-slate-400 truncate">Since {formatDate(org.createdDate)}</p>
                        </div>
                      </div>

                      <p className="text-sm text-slate-700 truncate">{org.contactName}</p>
                      <p className="text-sm text-slate-600 truncate">{org.contactEmail}</p>
                      <p className="text-sm text-slate-600 truncate">{org.phone}</p>
                      <p className="text-sm font-medium text-slate-700">{orgHomes.length}</p>
                      <p className="text-sm font-medium text-slate-700">{staffCount}</p>

                      {/* Subscription status */}
                      <div>
                        {isAwaitingPayment ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 ring-1 ring-amber-600/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                            Awaiting Payment
                          </span>
                        ) : (
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${sc.classes}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                            {sc.label}
                          </span>
                        )}
                        {isAwaitingPayment && paymentLinkSentAt && (
                          <p className="text-xs text-slate-400 mt-1">Link sent {formatDate(paymentLinkSentAt)}</p>
                        )}
                        {!isAwaitingPayment && isTrialing && daysRemaining !== null && (
                          <div className="mt-1">
                            {isExpired ? (
                              <p className="text-xs font-semibold text-red-600">Trial expired</p>
                            ) : (
                              <p className={`text-xs font-semibold ${isExpiringSoon ? "text-orange-600" : "text-blue-600"}`}>
                                {isExpiringSoon && "⚠ "}{daysRemaining} day{daysRemaining !== 1 ? "s" : ""} remaining
                              </p>
                            )}
                            {b.trialEndsAt && (
                              <p className="text-xs text-slate-400">Expires {formatDate(b.trialEndsAt)}</p>
                            )}
                          </div>
                        )}
                        {!isTrialing && !isAwaitingPayment && orgHomes.length > 0 && (
                          <p className="text-xs text-slate-400 mt-0.5">
                            £{netMonthly}/mo · £{grossMonthly.toFixed(0)} inc VAT
                          </p>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {isTrialing && (
                          <button
                            onClick={() => setExtendTrialOrg(org)}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 transition-colors"
                          >
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            Extend
                          </button>
                        )}
                        {bStatus !== "active" && (
                          <button
                            onClick={() => {
                              setSendLinkIsResend(isAwaitingPayment);
                              setSendLinkOrg(org);
                            }}
                            className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                              isAwaitingPayment
                                ? "text-amber-700 bg-amber-50 border border-amber-200 hover:bg-amber-100"
                                : isTrialing
                                ? "text-white bg-emerald-600 hover:bg-emerald-700"
                                : "text-white bg-blue-600 hover:bg-blue-700"
                            }`}
                          >
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                            </svg>
                            {isAwaitingPayment ? "Resend Link" : isTrialing ? "Send Payment Link" : "Setup Billing"}
                          </button>
                        )}
                        <button
                          onClick={() => setEditingOrg(org)}
                          className="px-2.5 py-1 rounded-md text-xs font-medium text-slate-500 bg-slate-50 hover:bg-slate-100 transition-colors"
                        >
                          Edit
                        </button>
                      </div>
                    </div>

                    {/* Expanded homes sub-table */}
                    {isExpanded && (
                      <div className="bg-slate-50 border-t border-slate-100 px-6 py-3">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                          Homes · {orgHomes.length}
                        </p>
                        {orgHomes.length === 0 ? (
                          <p className="text-sm text-slate-400 py-2">No homes registered for this organisation.</p>
                        ) : (
                          <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                            <div className="grid grid-cols-[2fr_1fr_2fr_2fr_0.6fr_0.6fr_1fr] gap-3 px-4 py-2 bg-slate-50 border-b border-slate-100 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                              <span>Home Name</span><span>SC/URN</span><span>Address</span>
                              <span>Responsible Individual</span><span>Children</span><span>Staff</span><span>Status</span>
                            </div>
                            <div className="divide-y divide-slate-50">
                              {orgHomes.map((home) => (
                                <div key={home.id} className="grid grid-cols-[2fr_1fr_2fr_2fr_0.6fr_0.6fr_1fr] gap-3 px-4 py-3 items-center text-sm">
                                  <div>
                                    <p className="font-medium text-slate-800">{home.name}</p>
                                    <p className="text-xs text-slate-400">{home.email}</p>
                                  </div>
                                  <p className="font-mono text-slate-600 text-xs">{home.sc_urn}</p>
                                  <p className="text-slate-600 text-xs truncate">{home.address}</p>
                                  <p className="text-slate-700 font-medium text-xs">{home.responsible_individual}</p>
                                  <p className="text-slate-700 font-medium">0</p>
                                  <p className="text-slate-700 font-medium">{dbStaff.filter(s => s.staff_homes.some(sh => sh.home_id === home.id)).length}</p>
                                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                                    home.status === "active" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
                                  }`}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${home.status === "active" ? "bg-emerald-500" : "bg-red-400"}`} />
                                    {home.status === "active" ? "Active" : "Inactive"}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <p className="text-sm text-slate-400 mt-4">
            Showing {filtered.length} of {orgs.length} organisations
          </p>
        </main>
      </div>
    </>
  );

}
