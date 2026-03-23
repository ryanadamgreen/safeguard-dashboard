-- ============================================================================
-- Create reports table
-- ============================================================================
-- Run this in the Supabase SQL editor (Dashboard → SQL Editor → New query).
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.reports (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  title             text        NOT NULL,
  type              text        NOT NULL,
  generated_at      timestamptz NOT NULL DEFAULT now(),
  date_range_start  date,
  date_range_end    date,
  home_id           uuid        NOT NULL REFERENCES public.homes(id) ON DELETE CASCADE,
  generated_by      uuid        REFERENCES public.staff(id) ON DELETE SET NULL,
  file_url          text,
  created_at        timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS reports_home_id_idx        ON public.reports(home_id);
CREATE INDEX IF NOT EXISTS reports_generated_at_idx   ON public.reports(generated_at DESC);
CREATE INDEX IF NOT EXISTS reports_generated_by_idx   ON public.reports(generated_by);

-- Enable RLS
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- Staff can read reports for homes they are assigned to
CREATE POLICY "Staff can read reports for their homes"
ON public.reports
FOR SELECT
TO authenticated
USING (
  home_id IN (
    SELECT home_id FROM public.staff_homes
    WHERE staff_id = auth.uid()
  )
);

-- super_admin full access
CREATE POLICY "Allow super_admin full access"
ON public.reports
FOR ALL
TO authenticated
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());
