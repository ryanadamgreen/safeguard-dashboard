"use client";

import { useAuth } from "./AuthProvider";
import type { Role } from "../lib/auth";

/**
 * Renders children only when the current user's role matches the policy.
 * Pass `allow` to whitelist roles, or `deny` to blacklist them.
 */
export function RoleGate({
  allow,
  deny,
  children,
  fallback,
}: {
  allow?: Role[];
  deny?: Role[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const { user } = useAuth();
  const role = user?.role;

  const visible =
    allow !== undefined
      ? role !== undefined && allow.includes(role)
      : deny !== undefined
      ? role === undefined || !deny.includes(role)
      : true;

  return visible ? <>{children}</> : fallback ? <>{fallback}</> : null;
}
