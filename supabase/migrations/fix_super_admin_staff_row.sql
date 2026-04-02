-- ============================================================================
-- Fix super_admin staff row so its id matches the auth.users UUID
-- ============================================================================
-- Run this in: Supabase Dashboard → SQL Editor → New query
--
-- What it does:
--   1. Looks up the auth UUID for rgmediaukltd@gmail.com
--   2. Looks up the existing staff row for that email (if any)
--   3. If a staff row exists but with the wrong id → updates it
--   4. If no staff row exists → inserts one
-- ============================================================================

DO $$
DECLARE
  v_auth_id   uuid;
  v_staff_id  uuid;
BEGIN
  -- 1. Get the auth UUID
  SELECT id INTO v_auth_id
  FROM auth.users
  WHERE email = 'rgmediaukltd@gmail.com'
  LIMIT 1;

  IF v_auth_id IS NULL THEN
    RAISE EXCEPTION 'No auth user found for rgmediaukltd@gmail.com';
  END IF;

  RAISE NOTICE 'Auth UUID: %', v_auth_id;

  -- 2. Check for an existing staff row by email
  SELECT id INTO v_staff_id
  FROM public.staff
  WHERE email = 'rgmediaukltd@gmail.com'
  LIMIT 1;

  IF v_staff_id IS NULL THEN
    -- No staff row at all — insert one
    RAISE NOTICE 'No staff row found — inserting with auth UUID %', v_auth_id;

    INSERT INTO public.staff (id, full_name, email, role, created_at)
    VALUES (
      v_auth_id,
      'Admin',
      'rgmediaukltd@gmail.com',
      'super_admin',
      now()
    );

    RAISE NOTICE 'Staff row inserted.';

  ELSIF v_staff_id = v_auth_id THEN
    -- Already correct — nothing to do
    RAISE NOTICE 'Staff row id already matches auth UUID. No change needed.';

  ELSE
    -- Staff row exists but has wrong id — update it
    RAISE NOTICE 'Staff row id % does not match auth UUID % — updating.', v_staff_id, v_auth_id;

    -- Clear staff_homes references first (FK constraint)
    UPDATE public.staff_homes SET staff_id = v_auth_id WHERE staff_id = v_staff_id;

    -- Update the staff row id
    UPDATE public.staff SET id = v_auth_id WHERE id = v_staff_id;

    RAISE NOTICE 'Staff row updated.';
  END IF;
END $$;

-- Verify the result
SELECT id, full_name, email, role, created_at
FROM public.staff
WHERE email = 'rgmediaukltd@gmail.com';
