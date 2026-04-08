-- OTP codes for 2FA login verification.
-- Codes are single-use and expire after 10 minutes.

CREATE TABLE IF NOT EXISTS public.otp_codes (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id   uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code       text NOT NULL,
  expires_at timestamptz NOT NULL,
  used       boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS otp_codes_staff_id_idx ON public.otp_codes (staff_id);

-- Row level security: only service role can read/write (API routes use service key)
ALTER TABLE public.otp_codes ENABLE ROW LEVEL SECURITY;
