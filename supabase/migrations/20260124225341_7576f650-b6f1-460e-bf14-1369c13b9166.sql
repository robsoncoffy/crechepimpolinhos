-- Fix weekly_menus public exposure: Restrict to authenticated users only
-- Drop the overly permissive policy and replace with proper access control

DROP POLICY IF EXISTS "Anyone can read menus" ON public.weekly_menus;

-- Create policy for authenticated parents and staff to read menus
CREATE POLICY "Authenticated users can read menus"
ON public.weekly_menus
FOR SELECT
TO authenticated
USING (true);

-- Staff can manage menus
CREATE POLICY "Staff can manage menus" ON public.weekly_menus
FOR ALL
TO authenticated
USING (public.is_staff(auth.uid()))
WITH CHECK (public.is_staff(auth.uid()));