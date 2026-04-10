"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { useAuth } from "./AuthProvider";
import { createSupabaseBrowserClient } from "../lib/supabase";

const HOME_NAV = [
  {
    label: "Dashboard",
    href: "/",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    label: "Alerts",
    href: "/alerts",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      </svg>
    ),
  },
  {
    label: "Children",
    href: "/children",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    label: "Reports",
    href: "/reports",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  {
    label: "Settings",
    href: "/settings",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
];

export default function Sidebar({ initialAlertCount, alertTimestamps }: { initialAlertCount: number; alertTimestamps: string[] }) {
  const pathname = usePathname();
  const { user, setUser, selectedHomeId, setSelectedHomeId } = useAuth();
  const router = useRouter();
  const [homeDropdownOpen, setHomeDropdownOpen] = useState(false);

  // ── Alerts badge: count alerts newer than last visit ──
  const [alertBadgeCount, setAlertBadgeCount] = useState(0);

  useEffect(() => {
    const lastVisit = localStorage.getItem("safeguard_alerts_last_visit");
    if (!lastVisit) {
      setAlertBadgeCount(initialAlertCount);
    } else {
      const since = new Date(lastVisit).getTime();
      const newCount = alertTimestamps.filter(
        (ts) => new Date(ts).getTime() > since
      ).length;
      setAlertBadgeCount(newCount);
    }
  }, [initialAlertCount, alertTimestamps]);

  // Clear badge when user visits the Alerts page
  useEffect(() => {
    if (pathname === "/alerts") {
      setAlertBadgeCount(0);
    }
  }, [pathname]);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    const channel = supabase
      .channel("alerts-sidebar")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "alerts" },
        () => {
          setAlertBadgeCount((c) => c + 1);
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "alerts" },
        (payload) => {
          // Decrement when an alert is resolved
          if (payload.new.resolved === true && !payload.old.resolved) {
            setAlertBadgeCount((c) => Math.max(0, c - 1));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  function handleSignOut() {
    setUser(null);
    router.push("/login");
  }

  const hasMultipleHomes = (user?.homeIds?.length ?? 0) > 1;
  const selectedHomeName =
    user?.homeIds && user?.homeNames
      ? user.homeNames[user.homeIds.indexOf(selectedHomeId ?? user.homeIds[0])] ??
        user.homeNames[0]
      : "Residential Monitoring";

  const displayInitials = user?.initials ?? "?";
  const displayName = user?.name ?? "—";
  const displayRole =
    user?.role === "HOME_STAFF"
      ? (user.jobTitle ?? "Home Staff")
      : user?.role === "READONLY_STAFF"
      ? "Read-only Access"
      : "Administrator";

  return (
    <aside className="flex flex-col w-64 h-screen sticky top-0 bg-slate-900 text-slate-100 flex-shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-700/60">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-500 flex-shrink-0">
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-white tracking-tight">SafeGuard</p>
          <p className="text-xs text-slate-400 truncate">{selectedHomeName}</p>
        </div>
      </div>

      {/* Home selector — only shown when assigned to 2+ homes */}
      {hasMultipleHomes && (
        <div className="px-3 pt-3 pb-1 relative">
          <button
            onClick={() => setHomeDropdownOpen((o) => !o)}
            className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors text-sm"
          >
            <div className="flex items-center gap-2 min-w-0">
              <svg className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              <span className="text-slate-200 font-medium truncate text-xs">{selectedHomeName}</span>
            </div>
            <svg
              className={`w-3.5 h-3.5 text-slate-400 flex-shrink-0 transition-transform ${homeDropdownOpen ? "rotate-180" : ""}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {homeDropdownOpen && (
            <div className="absolute left-3 right-3 mt-1 bg-slate-800 border border-slate-700 rounded-lg overflow-hidden shadow-lg z-20">
              {user!.homeIds!.map((id, i) => (
                <button
                  key={id}
                  onClick={() => { setSelectedHomeId(id); setHomeDropdownOpen(false); }}
                  className={`w-full flex items-center gap-2 px-3 py-2.5 text-left text-xs font-medium transition-colors ${
                    id === selectedHomeId
                      ? "bg-blue-600 text-white"
                      : "text-slate-300 hover:bg-slate-700"
                  }`}
                >
                  {id === selectedHomeId && (
                    <svg className="w-3 h-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                  {id !== selectedHomeId && <span className="w-3 flex-shrink-0" />}
                  {user!.homeNames?.[i] ?? `Home ${id}`}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        <p className="px-3 pb-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Navigation</p>
        {HOME_NAV.map((item) => {
          const isActive = pathname === item.href;
          const badge = item.href === "/alerts" ? alertBadgeCount : 0;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors group ${
                isActive
                  ? "bg-blue-600 text-white"
                  : "text-slate-400 hover:bg-slate-800 hover:text-slate-100"
              }`}
            >
              <span className={isActive ? "text-white" : "text-slate-500 group-hover:text-slate-300"}>
                {item.icon}
              </span>
              <span className="flex-1">{item.label}</span>
              {badge > 0 && (
                <span className="flex items-center justify-center w-5 h-5 text-xs font-bold rounded-full bg-red-500 text-white">
                  {badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Read-only indicator */}
      {user?.role === "READONLY_STAFF" && (
        <div className="mx-3 mb-3 flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700/60">
          <svg className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <p className="text-xs text-slate-400">View-only access</p>
        </div>
      )}

      {/* User profile */}
      <div className="px-3 py-4 border-t border-slate-700/60">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-800 cursor-pointer transition-colors group">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 text-sm font-semibold flex-shrink-0">
            {displayInitials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-200 truncate">{displayName}</p>
            <p className="text-xs text-slate-500 truncate">{displayRole}</p>
          </div>
          <button
            onClick={handleSignOut}
            title="Sign out"
            className="opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <svg className="w-4 h-4 text-slate-500 hover:text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </div>
    </aside>
  );
}
