-- Add JSONB settings columns to the devices table.
-- The Android app reads these on each heartbeat to know what to enforce.

ALTER TABLE public.devices
  ADD COLUMN IF NOT EXISTS settings_blocked_apps      jsonb NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS settings_blocked_categories jsonb NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS settings_blocked_domains   jsonb NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS settings_schedule          jsonb DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS settings_content_monitoring jsonb NOT NULL DEFAULT '[]';
