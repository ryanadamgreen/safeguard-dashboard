-- Allow the anon role to UPDATE devices (heartbeat / pairing confirmation from Android app)
CREATE POLICY "devices_anon_heartbeat" ON public.devices
FOR UPDATE TO anon
USING (true)
WITH CHECK (true);

-- Allow the anon role to SELECT devices (checkDeviceStatus from Android app)
CREATE POLICY "devices_anon_read" ON public.devices
FOR SELECT TO anon
USING (true);
