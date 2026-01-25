-- Fix UPDATE policy to include WITH CHECK for admins
DROP POLICY IF EXISTS "Admins can update pre-enrollments" ON public.pre_enrollments;
CREATE POLICY "Admins can update pre-enrollments" 
ON public.pre_enrollments 
FOR UPDATE 
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Add DELETE policy for admins (was missing)
DROP POLICY IF EXISTS "Admins can delete pre-enrollments" ON public.pre_enrollments;
CREATE POLICY "Admins can delete pre-enrollments" 
ON public.pre_enrollments 
FOR DELETE 
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));