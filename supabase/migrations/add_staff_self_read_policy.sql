-- ============================================================================
-- Staff: allow authenticated users to read their own record
-- ============================================================================
-- Run this in the Supabase SQL editor.
--
-- Why this is needed:
--   AuthProvider.fetchStaffProfile() queries the `staff` table with the anon
--   key (RLS enforced). Without a policy that allows a user to select their
--   own row, the query returns null → AuthProvider sets user=null →
--   RouteGuard redirects back to /login even though the session is valid.
--
-- NOTE: the staff table uses `id` as the auth user UUID (no separate user_id
-- column). The policy therefore checks `id = auth.uid()`.
-- ============================================================================

CREATE POLICY "Staff can read own record"
ON public.staff
FOR SELECT
TO authenticated
USING (id = auth.uid());


-- ============================================================================
-- staff_homes: allow staff to read their own home assignments
-- ============================================================================

CREATE POLICY "Staff can read own home assignments"
ON public.staff_homes
FOR SELECT
TO authenticated
USING (staff_id = auth.uid());


-- ============================================================================
-- homes: allow staff to read homes they are assigned to
-- ============================================================================

CREATE POLICY "Staff can read assigned homes"
ON public.homes
FOR SELECT
TO authenticated
USING (
  id IN (
    SELECT sh.home_id
    FROM public.staff_homes sh
    WHERE sh.staff_id = auth.uid()
  )
);
