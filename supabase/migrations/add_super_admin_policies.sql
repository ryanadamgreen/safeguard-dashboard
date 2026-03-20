-- ============================================================================
-- Add super_admin bypass RLS policies
-- ============================================================================
-- Run this in the Supabase SQL editor (Dashboard → SQL Editor → New query).
--
-- What this does:
--   1. Creates a SECURITY DEFINER helper function `is_super_admin()` so that
--      the staff-table policy can query the staff table without triggering
--      infinite RLS recursion.
--   2. Adds a "Allow super_admin full access" policy (FOR ALL) to every table.
--
-- Assumes:
--   • RLS is already ENABLED on all listed tables.
--   • The `staff` table has a `user_id` column (uuid) populated with
--     auth.uid() at insert time (e.g. via a trigger or your sign-up flow).
--   • The super_admin role value in staff.role is exactly 'super_admin'.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. Helper function
--    SECURITY DEFINER → runs as the function owner, bypassing RLS on staff.
--    This is required to avoid infinite recursion when the staff table's own
--    RLS policy tries to query the staff table.
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.staff
    WHERE staff.user_id = auth.uid()
      AND staff.role = 'super_admin'
  );
$$;

-- Grant execute to every authenticated session
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated;


-- ----------------------------------------------------------------------------
-- 2. organisations
-- ----------------------------------------------------------------------------

CREATE POLICY "Allow super_admin full access"
ON public.organisations
FOR ALL
TO authenticated
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());


-- ----------------------------------------------------------------------------
-- 3. homes
-- ----------------------------------------------------------------------------

CREATE POLICY "Allow super_admin full access"
ON public.homes
FOR ALL
TO authenticated
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());


-- ----------------------------------------------------------------------------
-- 4. staff
--    Uses is_super_admin() (SECURITY DEFINER) to avoid recursion.
-- ----------------------------------------------------------------------------

CREATE POLICY "Allow super_admin full access"
ON public.staff
FOR ALL
TO authenticated
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());


-- ----------------------------------------------------------------------------
-- 5. staff_homes
-- ----------------------------------------------------------------------------

CREATE POLICY "Allow super_admin full access"
ON public.staff_homes
FOR ALL
TO authenticated
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());


-- ----------------------------------------------------------------------------
-- 6. children
-- ----------------------------------------------------------------------------

CREATE POLICY "Allow super_admin full access"
ON public.children
FOR ALL
TO authenticated
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());


-- ----------------------------------------------------------------------------
-- 7. devices
-- ----------------------------------------------------------------------------

CREATE POLICY "Allow super_admin full access"
ON public.devices
FOR ALL
TO authenticated
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());


-- ----------------------------------------------------------------------------
-- 8. alerts
-- ----------------------------------------------------------------------------

CREATE POLICY "Allow super_admin full access"
ON public.alerts
FOR ALL
TO authenticated
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());


-- ----------------------------------------------------------------------------
-- 9. device_commands
-- ----------------------------------------------------------------------------

CREATE POLICY "Allow super_admin full access"
ON public.device_commands
FOR ALL
TO authenticated
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());
