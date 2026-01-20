-- Create discount_coupons table
CREATE TABLE public.discount_coupons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  description TEXT,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value NUMERIC(10, 2) NOT NULL CHECK (discount_value > 0),
  is_active BOOLEAN NOT NULL DEFAULT true,
  valid_from DATE,
  valid_until DATE,
  max_uses INTEGER,
  current_uses INTEGER NOT NULL DEFAULT 0,
  applicable_classes TEXT[] DEFAULT NULL,
  applicable_plans TEXT[] DEFAULT NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.discount_coupons ENABLE ROW LEVEL SECURITY;

-- Admin can manage coupons
CREATE POLICY "Admins can manage coupons"
ON public.discount_coupons
FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Staff can view active coupons
CREATE POLICY "Staff can view active coupons"
ON public.discount_coupons
FOR SELECT
USING (public.is_staff(auth.uid()) AND is_active = true);

-- Create trigger for updated_at
CREATE TRIGGER update_discount_coupons_updated_at
BEFORE UPDATE ON public.discount_coupons
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add index for code lookups
CREATE INDEX idx_discount_coupons_code ON public.discount_coupons(code);
CREATE INDEX idx_discount_coupons_active ON public.discount_coupons(is_active) WHERE is_active = true;