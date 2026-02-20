-- Add DELETE policy for employee_invites (was missing)
DROP POLICY IF EXISTS "Admins can delete employee invites" ON public.employee_invites;
CREATE POLICY "Admins can delete employee invites" 
ON public.employee_invites 
FOR DELETE 
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));