-- Add monitored categories column to devices table.
-- Used by the Monitor vs Block feature: monitored categories send alerts, blocked categories deny access.

ALTER TABLE public.devices
  ADD COLUMN IF NOT EXISTS settings_monitored_categories jsonb NOT NULL DEFAULT '[]';
