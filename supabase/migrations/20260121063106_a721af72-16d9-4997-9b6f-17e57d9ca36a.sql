
-- Fix: Allow users to read their OWN used invite (to get coupon_code)
-- while still blocking reuse by others

DROP POLICY IF EXISTS "Anyone can check valid invite code" ON public.parent_invites;

-- Updated policy: Users can read:
-- 1. Unused valid invites (for registration)
-- 2. Their OWN used invite (to get coupon_code for child registration)
-- 3. Admins can read all
CREATE POLICY "Users can check valid or own used invite" 
ON public.parent_invites FOR SELECT 
USING (
  -- Unused and valid invites (for registration flow)
  (used_by IS NULL AND (expires_at IS NULL OR expires_at > now()))
  -- User's own used invite (for coupon retrieval)
  OR used_by = auth.uid()
  -- Admins can see all
  OR has_role(auth.uid(), 'admin'::app_role)
);
