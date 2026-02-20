-- Add coupon_code column to parent_invites table
ALTER TABLE public.parent_invites ADD COLUMN coupon_code TEXT NULL;

-- Add index for coupon_code lookups
CREATE INDEX idx_parent_invites_coupon_code ON public.parent_invites(coupon_code) WHERE coupon_code IS NOT NULL;