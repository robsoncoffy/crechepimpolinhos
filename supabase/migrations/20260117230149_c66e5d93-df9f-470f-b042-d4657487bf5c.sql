-- Create table to store Asaas customer references
CREATE TABLE public.payment_customers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  parent_id UUID NOT NULL UNIQUE,
  asaas_customer_id TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table to store subscriptions
CREATE TABLE public.subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  child_id UUID NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  parent_id UUID NOT NULL,
  asaas_subscription_id TEXT UNIQUE,
  value DECIMAL(10,2) NOT NULL,
  billing_day INTEGER NOT NULL DEFAULT 10,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table to store invoices/payments
CREATE TABLE public.invoices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  child_id UUID NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  parent_id UUID NOT NULL,
  asaas_payment_id TEXT UNIQUE,
  description TEXT NOT NULL,
  value DECIMAL(10,2) NOT NULL,
  due_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  payment_date DATE,
  payment_type TEXT,
  invoice_url TEXT,
  pix_code TEXT,
  bank_slip_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.payment_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- RLS for payment_customers
CREATE POLICY "Staff can view all payment customers"
  ON public.payment_customers FOR SELECT
  USING (public.is_staff(auth.uid()));

CREATE POLICY "Staff can manage payment customers"
  ON public.payment_customers FOR ALL
  USING (public.is_staff(auth.uid()));

CREATE POLICY "Parents can view own payment customer"
  ON public.payment_customers FOR SELECT
  USING (auth.uid() = parent_id);

-- RLS for subscriptions
CREATE POLICY "Staff can view all subscriptions"
  ON public.subscriptions FOR SELECT
  USING (public.is_staff(auth.uid()));

CREATE POLICY "Staff can manage subscriptions"
  ON public.subscriptions FOR ALL
  USING (public.is_staff(auth.uid()));

CREATE POLICY "Parents can view own subscriptions"
  ON public.subscriptions FOR SELECT
  USING (auth.uid() = parent_id);

-- RLS for invoices
CREATE POLICY "Staff can view all invoices"
  ON public.invoices FOR SELECT
  USING (public.is_staff(auth.uid()));

CREATE POLICY "Staff can manage invoices"
  ON public.invoices FOR ALL
  USING (public.is_staff(auth.uid()));

CREATE POLICY "Parents can view own invoices"
  ON public.invoices FOR SELECT
  USING (auth.uid() = parent_id);

-- Create indexes
CREATE INDEX idx_subscriptions_child_id ON public.subscriptions(child_id);
CREATE INDEX idx_subscriptions_parent_id ON public.subscriptions(parent_id);
CREATE INDEX idx_invoices_child_id ON public.invoices(child_id);
CREATE INDEX idx_invoices_parent_id ON public.invoices(parent_id);
CREATE INDEX idx_invoices_status ON public.invoices(status);
CREATE INDEX idx_invoices_due_date ON public.invoices(due_date);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.invoices;

-- Add update triggers
CREATE TRIGGER update_payment_customers_updated_at
  BEFORE UPDATE ON public.payment_customers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_invoices_updated_at
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();