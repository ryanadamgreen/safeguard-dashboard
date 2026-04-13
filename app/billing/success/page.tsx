"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
function SuccessContent() {
  const searchParams = useSearchParams();
  const homes    = searchParams.get("homes");
  const orgName  = searchParams.get("name");

  const homeCount    = homes ? parseInt(homes, 10) : null;
  const netMonthly   = homeCount ? homeCount * 150 : null;
  const grossMonthly = netMonthly ? netMonthly * 1.2 : null;

  // Subscription activation is handled server-side by the Stripe webhook.

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm w-full max-w-md overflow-hidden">
        {/* Green header band */}
        <div className="bg-emerald-600 px-8 py-6 text-center">
          <div className="flex items-center justify-center w-14 h-14 rounded-full bg-white/20 mx-auto mb-4">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-white">Payment set up successfully!</h1>
          <p className="text-sm text-emerald-100 mt-1">Your ScreenAlert subscription is now active.</p>
        </div>

        <div className="px-8 py-6 space-y-5">
          {/* Org name */}
          {orgName && (
            <div className="text-center">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Organisation</p>
              <p className="text-base font-semibold text-slate-800">{decodeURIComponent(orgName)}</p>
            </div>
          )}

          {/* Monthly charge breakdown */}
          {homeCount && netMonthly && grossMonthly && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl px-5 py-4 space-y-2.5">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Monthly charge</p>
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between text-slate-600">
                  <span>{homeCount} home{homeCount !== 1 ? "s" : ""} × £150/month</span>
                  <span className="font-medium">£{netMonthly.toLocaleString("en-GB")}.00</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>VAT (20%)</span>
                  <span>£{(netMonthly * 0.2).toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-semibold text-slate-800 pt-1.5 border-t border-slate-200">
                  <span>Total per month</span>
                  <span>£{grossMonthly.toFixed(2)}</span>
                </div>
              </div>
              <p className="text-xs text-slate-400 pt-0.5">Billed monthly via Stripe. Cancel anytime.</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col gap-2.5 pt-1">
            <Link
              href="/dashboard"
              className="flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              Return to Dashboard
            </Link>
            <Link
              href="/admin/billing"
              className="px-4 py-2.5 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors text-center"
            >
              View Billing
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function BillingSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
          <div className="w-5 h-5 border-2 border-slate-200 border-t-blue-500 rounded-full animate-spin" />
        </div>
      }
    >
      <SuccessContent />
    </Suspense>
  );
}
