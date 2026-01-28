
-- Allow users to read pre_enrollments linked to their parent_invite
CREATE POLICY "Users can view pre_enrollments linked to their invite"
ON public.pre_enrollments
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM parent_invites pi
    WHERE pi.pre_enrollment_id = pre_enrollments.id
    AND (pi.used_by = auth.uid() OR pi.email = (SELECT email FROM auth.users WHERE id = auth.uid()))
  )
);
