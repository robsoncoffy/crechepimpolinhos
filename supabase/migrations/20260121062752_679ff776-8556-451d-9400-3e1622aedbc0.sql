-- Update parent_invites RLS policies to block used invites

-- Drop existing permissive policies that allow reading used invites
DROP POLICY IF EXISTS "Anyone can check valid invite code" ON public.parent_invites;
DROP POLICY IF EXISTS "Staff can view invites" ON public.parent_invites;

-- Create new policy: Anyone can only check UNUSED and valid invite codes
CREATE POLICY "Anyone can check valid invite code" 
ON public.parent_invites FOR SELECT 
USING (
  (used_by IS NULL AND (expires_at IS NULL OR expires_at > now()))
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Admin can manage all invites (including used ones for history)
DROP POLICY IF EXISTS "Admin can manage invites" ON public.parent_invites;
CREATE POLICY "Admin can manage all parent invites" 
ON public.parent_invites FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- User can mark invite as used during registration
DROP POLICY IF EXISTS "User can mark invite as used" ON public.parent_invites;
CREATE POLICY "User can mark invite as used" 
ON public.parent_invites FOR UPDATE 
USING (used_by IS NULL)
WITH CHECK (used_by IS NOT NULL);

-- Update employee_invites RLS policies similarly
DROP POLICY IF EXISTS "Anyone can check valid invite code" ON public.employee_invites;

-- Create updated policy: only unused and valid invites can be checked by anyone
CREATE POLICY "Anyone can check valid invite code" 
ON public.employee_invites FOR SELECT 
USING (
  (is_used = false AND expires_at > now())
  OR is_staff(auth.uid())
);

-- Ensure update policy allows marking as used
DROP POLICY IF EXISTS "User can mark invite as used or admin can update" ON public.employee_invites;
CREATE POLICY "User can mark invite as used or admin can update" 
ON public.employee_invites FOR UPDATE 
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  OR (is_used = false AND expires_at > now())
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) 
  OR (is_used = true)
);