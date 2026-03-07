ALTER TABLE public.child_registrations
  ADD COLUMN IF NOT EXISTS custom_monthly_value numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS billing_day integer DEFAULT 10,
  ADD COLUMN IF NOT EXISTS relationship text DEFAULT 'responsável';