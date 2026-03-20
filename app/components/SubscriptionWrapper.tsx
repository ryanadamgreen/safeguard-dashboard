"use client";

import { createContext, useContext } from "react";

// ─── Context ──────────────────────────────────────────────────────────────────

interface SubscriptionContextValue {
  /** True when the user's organisation has an active or trialing subscription */
  isActive: boolean;
  status: string | null;
}

const SubscriptionContext = createContext<SubscriptionContextValue>({
  isActive: true,
  status: null,
});

export function useSubscription() {
  return useContext(SubscriptionContext);
}

// ─── Wrapper ──────────────────────────────────────────────────────────────────

/**
 * Wraps dashboard page content.
 * Subscription status is fetched server-side via the layout and passed as a prop.
 * When subscriptionStatus is null or "active"/"trialing" the page renders normally.
 * When inactive a banner is shown and buttons within the content area are disabled.
 */
export function SubscriptionWrapper({
  children,
  subscriptionStatus = null,
}: {
  children: React.ReactNode;
  subscriptionStatus?: string | null;
}) {
  const active =
    subscriptionStatus === null ||
    subscriptionStatus === "active" ||
    subscriptionStatus === "trialing";

  return (
    <SubscriptionContext.Provider value={{ isActive: active, status: subscriptionStatus }}>
      {!active && (
        <div className="w-full bg-amber-50 border-b border-amber-200 px-6 py-3 flex items-center gap-3 flex-shrink-0">
          <svg
            className="w-4 h-4 text-amber-600 flex-shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
            />
          </svg>
          <p className="text-sm font-medium text-amber-800">
            Your subscription requires attention. Please contact your administrator.
          </p>
        </div>
      )}
      <div
        className={
          !active
            ? "[&_button]:pointer-events-none [&_button]:opacity-50 [&_button]:cursor-not-allowed"
            : ""
        }
      >
        {children}
      </div>
    </SubscriptionContext.Provider>
  );
}

// ─── Inline gate (opt-in per component) ──────────────────────────────────────

/**
 * Renders children only when the subscription is active.
 */
export function SubscriptionGate({
  children,
  fallback = null,
}: {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const { isActive } = useSubscription();
  return isActive ? <>{children}</> : <>{fallback}</>;
}
