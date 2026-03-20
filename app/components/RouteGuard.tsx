"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "./AuthProvider";
import type { Role } from "../lib/auth";

export function RouteGuard({
  allow,
  redirectTo,
  children,
}: {
  allow: Role[];
  redirectTo: string;
  children: React.ReactNode;
}) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && (user === null || !allow.includes(user.role))) {
      router.replace(redirectTo);
    }
  }, [user, isLoading, allow, redirectTo, router]);

  if (isLoading || !user || !allow.includes(user.role)) {
    return null;
  }

  return <>{children}</>;
}
