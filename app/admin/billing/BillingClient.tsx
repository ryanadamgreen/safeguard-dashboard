"use client";

import Link from "next/link";
import { type DbOrganisation, type DbHome } from "../../lib/supabase/queries";

// ─── Local constants ──────────────────────────────────────────────────────────

const PRICE_PER_HOME_GBP = 150;
const VAT_RATE = 0.2;
type BillingStatus = "active" | "trialing" | "past_due" | "canceled" | "inactive" | "unpaid";

function getTrialDaysRemaining(iso: string): number {
  return Math.ceil((new Date(iso).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCurrency(gbp: number): string {
  return `£${gbp.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(iso?: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

const statusConfig: Record<
  BillingStatus,
  { label: string; classes: string; dot: string }
> = {
  active:   { label: "Active",    classes: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20", dot: "bg-emerald-500" },
  trialing: { label: "Trial",     classes: "bg-blue-50 text-blue-700 ring-1 ring-blue-600/20",           dot: "bg-blue-500"    },
  past_due: { label: "Past Due",  classes: "bg-red-50 text-red-700 ring-1 ring-red-600/20",              dot: "bg-red-500"     },
  unpaid:   { label: "Unpaid",    classes: "bg-red-50 text-red-700 ring-1 ring-red-600/20",              dot: "bg-red-500"     },
  canceled: { label: "Cancelled", classes: "bg-slate-100 text-slate-500 ring-1 ring-slate-200",          dot: "bg-slate-400"   },
  inactive: { label: "Inactive",  classes: "bg-slate-100 text-slate-500 ring-1 ring-slate-200",          dot: "bg-slate-400"   },
};

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  accent = false,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-6 py-5">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-2xl font-bold ${accent ? "text-blue-600" : "text-slate-800"}`}>{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
    </div>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface BillingClientProps {
  dbOrgs: DbOrganisation[];
  dbHomes: DbHome[];
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function BillingClient({ dbOrgs, dbHomes }: BillingClientProps) {
  // Map DB orgs to billing row shape — no useState/useEffect needed
  const billingRows = dbOrgs.map(org => {
    const homeCount = dbHomes.filter(h => h.organisation_id === org.id).length;
    const status = (org.subscription_status ?? "inactive") as BillingStatus;
    return {
      orgId: org.id,
      orgName: org.name,
      subscriptionStatus: status,
      trialEndsAt: org.trial_expires_at ?? undefined,
      homeCount,
      failedPayment: false,
      currentPeriodEnd: undefined as string | undefined,
    };
  });

  const netMRR = billingRows.filter(b => b.subscriptionStatus === "active").reduce((sum, b) => sum + b.homeCount * PRICE_PER_HOME_GBP, 0);
  const grossMRR = netMRR * (1 + VAT_RATE);
  const activeCount = billingRows.filter((b) => b.subscriptionStatus === "active").length;
  const trialRows = billingRows.filter((b) => b.subscriptionStatus === "trialing");
  const failedCount = billingRows.filter((b) => b.failedPayment).length;

  // Revenue pipeline: potential MRR if all trials convert
  const pipelineNetMRR = trialRows.reduce((sum, b) => sum + b.homeCount * PRICE_PER_HOME_GBP, 0);

  return (
    <div className="flex-1 flex flex-col">
      {/* Top bar */}
      <header className="flex items-center justify-between px-8 py-5 bg-white border-b border-slate-200">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">Billing</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Subscription revenue and payment status
          </p>
        </div>
        <Link
          href="/admin/organisations"
          className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
        >
          Manage Organisations
        </Link>
      </header>

      <main className="flex-1 p-8 space-y-8">
        {/* Stat cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Monthly Recurring Revenue"
            value={formatCurrency(netMRR)}
            sub="Ex-VAT · paid subscriptions only"
            accent
          />
          <StatCard
            label="Total incl. VAT (20%)"
            value={formatCurrency(grossMRR)}
            sub="What organisations are charged"
          />
          <StatCard
            label="Active Subscriptions"
            value={String(activeCount)}
            sub={`of ${billingRows.length} organisations`}
          />
          <StatCard
            label="Failed Payments"
            value={String(failedCount)}
            sub={failedCount > 0 ? "Requires attention" : "All clear"}
          />
        </div>

        {/* Active Trials section */}
        {trialRows.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-semibold text-slate-700">Active Trials</h2>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700">
                    {trialRows.length}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Revenue pipeline: <strong className="text-slate-600">{trialRows.length} trial{trialRows.length !== 1 ? "s" : ""} converting</strong> = {formatCurrency(pipelineNetMRR)}/mo potential MRR (ex-VAT)
                </p>
              </div>
            </div>

            <div className="grid grid-cols-[2fr_0.8fr_1.2fr_1.4fr_1.6fr_1.2fr] gap-4 px-6 py-3 bg-slate-50 border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <span>Organisation</span>
              <span>Homes</span>
              <span>Potential MRR</span>
              <span>Potential (inc-VAT)</span>
              <span>Trial Expiry</span>
              <span>Days Left</span>
            </div>

            <div className="divide-y divide-slate-100">
              {trialRows
                .sort((a, b) => {
                  const dA = a.trialEndsAt ? getTrialDaysRemaining(a.trialEndsAt) : 999;
                  const dB = b.trialEndsAt ? getTrialDaysRemaining(b.trialEndsAt) : 999;
                  return dA - dB;
                })
                .map((row) => {
                  const net = row.homeCount * PRICE_PER_HOME_GBP;
                  const gross = net * (1 + VAT_RATE);
                  const days = row.trialEndsAt ? getTrialDaysRemaining(row.trialEndsAt) : null;
                  const expiringSoon = days !== null && days <= 7 && days > 0;
                  const expired = days !== null && days <= 0;

                  return (
                    <div
                      key={row.orgId}
                      className={`grid grid-cols-[2fr_0.8fr_1.2fr_1.4fr_1.6fr_1.2fr] gap-4 px-6 py-4 items-center ${expiringSoon ? "bg-amber-50/40" : "hover:bg-slate-50/60"} transition-colors`}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          {expiringSoon && (
                            <svg className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                            </svg>
                          )}
                          <p className="text-sm font-semibold text-slate-800 truncate">{row.orgName}</p>
                        </div>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 mt-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                          Trial
                        </span>
                      </div>
                      <p className="text-sm font-medium text-slate-700">{row.homeCount}</p>
                      <p className="text-sm font-medium text-slate-600">{formatCurrency(net)}</p>
                      <p className="text-sm font-semibold text-slate-800">{formatCurrency(gross)}</p>
                      <p className="text-sm text-slate-600">{formatDate(row.trialEndsAt)}</p>
                      <div>
                        {days !== null ? (
                          expired ? (
                            <span className="text-sm font-semibold text-red-600">Expired</span>
                          ) : (
                            <span className={`text-sm font-semibold ${expiringSoon ? "text-amber-700" : "text-blue-600"}`}>
                              {days} day{days !== 1 ? "s" : ""}
                            </span>
                          )
                        ) : (
                          <span className="text-sm text-slate-400">—</span>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* Per-home pricing note */}
        <div className="flex items-center gap-3 px-4 py-3 bg-blue-50 border border-blue-100 rounded-lg">
          <svg
            className="w-4 h-4 text-blue-500 flex-shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-xs text-blue-700">
            Pricing: <strong>£{PRICE_PER_HOME_GBP} + {VAT_RATE * 100}% VAT per home per month</strong> — billed via Stripe using quantity = number of homes.
          </p>
        </div>

        {/* Billing table — paid/non-trial only */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-700">All Organisations</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {billingRows.length} organisations · rows in red indicate failed payments
            </p>
          </div>

          <div className="grid grid-cols-[2fr_0.8fr_1.2fr_1.4fr_1.4fr_1.4fr] gap-4 px-6 py-3 bg-slate-50 border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wider">
            <span>Company</span>
            <span>Homes</span>
            <span>Monthly (ex-VAT)</span>
            <span>Monthly (inc-VAT)</span>
            <span>Status</span>
            <span>Next Payment</span>
          </div>

          <div className="divide-y divide-slate-100">
            {billingRows.length === 0 ? (
              <p className="text-sm text-slate-400 px-6 py-8 text-center">
                No billing records found.
              </p>
            ) : (
              billingRows.map((row) => {
                const isFailed = row.failedPayment || row.subscriptionStatus === "past_due" || row.subscriptionStatus === "unpaid";
                const isTrialing = row.subscriptionStatus === "trialing";
                const net = row.homeCount * PRICE_PER_HOME_GBP;
                const gross = net * (1 + VAT_RATE);
                const sc = statusConfig[row.subscriptionStatus];

                return (
                  <div
                    key={row.orgId}
                    className={`grid grid-cols-[2fr_0.8fr_1.2fr_1.4fr_1.4fr_1.4fr] gap-4 px-6 py-4 items-center transition-colors ${
                      isFailed ? "bg-red-50/60 hover:bg-red-50" : "hover:bg-slate-50/60"
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        {isFailed && (
                          <svg className="w-4 h-4 text-red-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                          </svg>
                        )}
                        <p className={`text-sm font-semibold truncate ${isFailed ? "text-red-800" : "text-slate-800"}`}>
                          {row.orgName}
                        </p>
                      </div>
                    </div>

                    <p className={`text-sm font-medium ${isFailed ? "text-red-700" : "text-slate-700"}`}>
                      {row.homeCount}
                    </p>

                    <p className={`text-sm font-medium ${isTrialing ? "text-slate-400" : isFailed ? "text-red-700" : "text-slate-700"}`}>
                      {isTrialing ? "—" : formatCurrency(net)}
                    </p>

                    <p className={`text-sm font-semibold ${isTrialing ? "text-slate-400" : isFailed ? "text-red-700" : "text-slate-800"}`}>
                      {isTrialing ? "—" : formatCurrency(gross)}
                    </p>

                    <div>
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${sc.classes}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                        {sc.label}
                      </span>
                      {isFailed && (
                        <p className="text-xs text-red-500 mt-1 font-medium">Payment failed</p>
                      )}
                    </div>

                    <div>
                      {isTrialing ? (
                        <p className="text-sm text-blue-600 font-medium">
                          {row.trialEndsAt ? `Expires ${formatDate(row.trialEndsAt)}` : "—"}
                        </p>
                      ) : (
                        <>
                          <p className={`text-sm ${isFailed ? "text-red-600 font-medium" : "text-slate-600"}`}>
                            {formatDate(row.currentPeriodEnd)}
                          </p>
                          {isFailed && row.currentPeriodEnd && (
                            <p className="text-xs text-red-400 mt-0.5">Overdue</p>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Pricing breakdown */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-700">Pricing Model</h2>
          </div>
          <div className="px-6 py-5">
            <div className="grid grid-cols-3 gap-6 text-sm">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Per home / month</p>
                <p className="text-xl font-bold text-slate-800">£{PRICE_PER_HOME_GBP}</p>
                <p className="text-xs text-slate-400">+ {VAT_RATE * 100}% VAT</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Example — 3 homes</p>
                <p className="text-xl font-bold text-slate-800">£{PRICE_PER_HOME_GBP * 3}</p>
                <p className="text-xs text-slate-400">£{PRICE_PER_HOME_GBP * 3 * (1 + VAT_RATE)} incl. VAT</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Billing</p>
                <p className="text-sm font-medium text-slate-700">Stripe recurring</p>
                <p className="text-xs text-slate-400">Price × quantity (homes)</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
