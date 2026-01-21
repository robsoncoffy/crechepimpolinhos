
-- Allow authenticated users to read active coupons (for registration flow)
CREATE POLICY "Authenticated users can view active coupons" 
ON public.discount_coupons FOR SELECT 
TO authenticated
USING (is_active = true);
