-- Add resolved tracking columns to the alerts table.
-- resolved: false by default (all existing alerts are unresolved)
-- resolved_at: set to the timestamp when the alert was resolved

ALTER TABLE public.alerts
  ADD COLUMN IF NOT EXISTS resolved    boolean     NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS resolved_at timestamptz          DEFAULT NULL;
