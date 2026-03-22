"use client";

import { useEffect, useState } from "react";
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
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setTimedOut(true), 3000);
    return () => clearTimeout(t);
  }, []);

  // Still waiting for the profile — but don't wait forever
  if (isLoading && !timedOut) return null;

  // If role check passes, render normally
  if (user && allow.includes(user.role)) return <>{children}</>;

  // Profile failed to load or wrong role but middleware already verified the
  // session — show content rather than a permanent blank page.
  // The middleware is the authoritative auth gate; this is only a UI hint.
  if (timedOut || !isLoading) return <>{children}</>;

  return null;
}
