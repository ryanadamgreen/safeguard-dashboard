-- Allow authenticated staff to SELECT devices for homes they are assigned to.
-- This covers the dashboard polling in checkPairingStatus and the children page
-- device list, in case the service role key is unavailable and the anon/auth
-- client is used instead.

CREATE POLICY "devices_staff_read"
ON public.devices
FOR SELECT
TO authenticated
USING (
  home_id IN (
    SELECT home_id FROM public.staff_homes
    WHERE staff_id = auth.uid()
  )
);
