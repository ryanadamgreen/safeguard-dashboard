-- ============================================================================
-- Staff: allow authenticated users to read their own record
-- ============================================================================
-- Run this in the Supabase SQL editor.
--
-- Why this is needed:
--   AuthProvider.fetchStaffProfile() queries the `staff` table with the anon
--   key (RLS enforced).  Without a policy that allows a user to select their
--   own row, the query returns null → AuthProvider sets user=null →
--   RouteGuard redirects back to /login even though the session is valid.
--
-- This policy is a narrow read-only grant: each user can only see the row
-- where staff.user_id matches their own auth.uid().
--
-- Assumes:
--   • RLS is already ENABLED on the staff table.
--   • The staff table has a user_id uuid column populated at sign-up /
--     on the first login via a trigger or your onboarding flow.
-- ============================================================================

CREATE POLICY "Staff can read own record"
ON public.staff
FOR SELECT
TO authenticated
USING (user_id = auth.uid());


-- ============================================================================
-- staff_homes: allow staff to read their own home assignments
-- ============================================================================
-- AuthProvider also queries staff_homes to build homeIds / homeNames.
-- Without this policy, that join returns empty even if the row exists.

CREATE POLICY "Staff can read own home assignments"
ON public.staff_homes
FOR SELECT
TO authenticated
USING (
  staff_id IN (
    SELECT id FROM public.staff WHERE user_id = auth.uid()
  )
);


-- ============================================================================
-- homes: allow staff to read homes they are assigned to
-- ============================================================================
-- The staff_homes join in AuthProvider does .select("home_id, homes(name)")
-- which requires the authenticated user to be able to read the homes rows.

CREATE POLICY "Staff can read assigned homes"
ON public.homes
FOR SELECT
TO authenticated
USING (
  id IN (
    SELECT sh.home_id
    FROM public.staff_homes sh
    INNER JOIN public.staff s ON s.id = sh.staff_id
    WHERE s.user_id = auth.uid()
  )
);
