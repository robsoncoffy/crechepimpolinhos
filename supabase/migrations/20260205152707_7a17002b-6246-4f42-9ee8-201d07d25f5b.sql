-- Add monthly_value column to enrollment_contracts for custom pricing
ALTER TABLE public.enrollment_contracts 
ADD COLUMN IF NOT EXISTS monthly_value DECIMAL(10,2);

-- Add comment
COMMENT ON COLUMN public.enrollment_contracts.monthly_value IS 'Custom monthly value set by admin during approval. If null, use standard pricing based on class/plan.';