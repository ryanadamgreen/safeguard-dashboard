export type Role = "SUPER_ADMIN" | "ADMIN" | "HOME_STAFF" | "READONLY_STAFF";

export type JobTitle =
  | "Responsible Individual"
  | "Registered Manager"
  | "Deputy Manager"
  | "Team Leader"
  | "Support Worker"
  | "Social Worker";

export interface AuthUser {
  id: string; // UUID — matches Supabase auth user id
  name: string;
  initials: string;
  email: string;
  role: Role;
  jobTitle?: JobTitle;
  /** Ordered list of home UUIDs the user is assigned to */
  homeIds?: string[];
  /** Corresponding home names (parallel array to homeIds) */
  homeNames?: string[];
}

export function roleLabel(role: Role): string {
  switch (role) {
    case "SUPER_ADMIN":    return "Super Administrator";
    case "ADMIN":          return "Administrator";
    case "HOME_STAFF":     return "Home Staff";
    case "READONLY_STAFF": return "Read-only Access";
  }
}

/** Map Supabase DB role string → app Role enum */
export function mapDbRole(dbRole: string): Role {
  if (dbRole === "super_admin")    return "SUPER_ADMIN";
  if (dbRole === "admin")          return "ADMIN";
  if (dbRole === "readonly_staff") return "READONLY_STAFF";
  return "HOME_STAFF";
}
