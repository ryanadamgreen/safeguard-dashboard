-- ============================================================================
-- Add report_schedules table and extend reports table
-- ============================================================================
-- Run in: Supabase Dashboard → SQL Editor → New query
-- ============================================================================

-- ── Extend reports table ────────────────────────────────────────────────────

ALTER TABLE public.reports
  ADD COLUMN IF NOT EXISTS status             text    NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS children_included  uuid[];

-- ── report_schedules table ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.report_schedules (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  home_id      uuid        NOT NULL REFERENCES public.homes(id) ON DELETE CASCADE,
  type         text        NOT NULL,
  frequency    text        NOT NULL CHECK (frequency IN ('weekly', 'monthly')),
  recipients   text[]      NOT NULL DEFAULT '{}',
  created_by   uuid        REFERENCES public.staff(id) ON DELETE SET NULL,
  next_run_at  timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS report_schedules_home_id_idx ON public.report_schedules(home_id);

-- Enable RLS
ALTER TABLE public.report_schedules ENABLE ROW LEVEL SECURITY;

-- Staff can read/insert/delete schedules for their homes
CREATE POLICY "Staff can manage schedules for their homes"
ON public.report_schedules
FOR ALL
TO authenticated
USING (
  home_id IN (
    SELECT home_id FROM public.staff_homes
    WHERE staff_id = auth.uid()
  )
)
WITH CHECK (
  home_id IN (
    SELECT home_id FROM public.staff_homes
    WHERE staff_id = auth.uid()
  )
);

-- super_admin full access
CREATE POLICY "Allow super_admin full access"
ON public.report_schedules
FOR ALL
TO authenticated
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());
