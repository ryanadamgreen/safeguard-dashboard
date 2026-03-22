"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { createSupabaseBrowserClient } from "../lib/supabase";
import { mapDbRole, type AuthUser } from "../lib/auth";

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  setUser: (u: AuthUser | null) => void;
  /** Currently selected home UUID for multi-home staff */
  selectedHomeId: string | null;
  setSelectedHomeId: (id: string) => void;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  isLoading: true,
  setUser: () => {},
  selectedHomeId: null,
  setSelectedHomeId: () => {},
});

const SELECTED_HOME_KEY = "safeguard_selected_home_id";

const supabase = createSupabaseBrowserClient();

async function fetchStaffProfile(_email: string): Promise<AuthUser | null> {
  // Fetch via API route which uses the service-role key — bypasses RLS entirely.
  // This avoids the redirect loop caused by RLS blocking the anon client from
  // reading the staff row even when a valid session exists.
  const res = await fetch("/api/me");
  if (!res.ok) {
    console.error("[AuthProvider] /api/me returned", res.status);
    return null;
  }
  const { staff } = await res.json();

  const role = mapDbRole(staff.role);
  let homeIds: string[] = [];
  let homeNames: string[] = [];

  if (role !== "ADMIN") {
    const { data: staffHomes } = await supabase
      .from("staff_homes")
      .select("home_id, homes(name)")
      .eq("staff_id", staff.id);

    if (staffHomes && staffHomes.length > 0) {
      homeIds = staffHomes.map((sh) => sh.home_id);
      homeNames = staffHomes.map((sh) => {
        const h = sh.homes;
        return h && !Array.isArray(h) ? (h as { name: string }).name : "";
      });
    }
  }

  const nameParts = (staff.full_name as string).trim().split(/\s+/);
  const initials = nameParts
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return {
    id: staff.id,
    name: staff.full_name,
    initials,
    email: staff.email,
    role,
    jobTitle: staff.job_title ?? undefined,
    homeIds: homeIds.length > 0 ? homeIds : undefined,
    homeNames: homeNames.length > 0 ? homeNames : undefined,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUserState] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedHomeId, setSelectedHomeIdState] = useState<string | null>(null);
  const initialised = useRef(false);

  function applyUser(staffUser: AuthUser | null) {
    setUserState(staffUser);
    if (staffUser?.homeIds?.[0]) {
      const stored = localStorage.getItem(SELECTED_HOME_KEY);
      const validStored =
        stored && staffUser.homeIds?.includes(stored) ? stored : null;
      setSelectedHomeIdState(validStored ?? staffUser.homeIds![0]);
    } else {
      setSelectedHomeIdState(null);
    }
  }

  useEffect(() => {
    // Resolve initial session once
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user?.email) {
        fetchStaffProfile(session.user.email).then((staffUser) => {
          applyUser(staffUser);
          setIsLoading(false);
          initialised.current = true;
        });
      } else {
        setIsLoading(false);
        initialised.current = true;
      }
    });

    // React to subsequent auth changes (sign-in / sign-out)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      // Ignore the initial SIGNED_IN that mirrors getSession
      if (!initialised.current) return;

      if (event === "SIGNED_IN" && session?.user?.email) {
        const staffUser = await fetchStaffProfile(session.user.email);
        applyUser(staffUser);
        setIsLoading(false);
      } else if (event === "SIGNED_OUT") {
        setUserState(null);
        setSelectedHomeIdState(null);
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  function setUser(u: AuthUser | null) {
    setUserState(u);
    if (u) {
      const firstHome = u.homeIds?.[0] ?? null;
      setSelectedHomeIdState(firstHome ?? null);
      if (firstHome) localStorage.setItem(SELECTED_HOME_KEY, firstHome);
    } else {
      localStorage.removeItem(SELECTED_HOME_KEY);
      supabase.auth.signOut();
    }
  }

  function setSelectedHomeId(id: string) {
    setSelectedHomeIdState(id);
    localStorage.setItem(SELECTED_HOME_KEY, id);
  }

  return (
    <AuthContext.Provider
      value={{ user, isLoading, setUser, selectedHomeId, setSelectedHomeId }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
