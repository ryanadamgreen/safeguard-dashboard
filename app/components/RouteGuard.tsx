"use client";

import { useAuth } from "./AuthProvider";
import type { Role } from "../lib/auth";

export function RouteGuard({
  allow,
  children,
}: {
  allow: Role[];
  redirectTo?: string; // kept for API compatibility, middleware handles redirects
  children: React.ReactNode;
}) {
  const { user, isLoading } = useAuth();

  if (isLoading || !user || !allow.includes(user.role)) {
    return null;
  }

  return <>{children}</>;
}
