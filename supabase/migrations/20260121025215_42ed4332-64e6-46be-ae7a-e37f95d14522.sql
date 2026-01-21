-- Create table to store all Asaas customers (linked or not)
CREATE TABLE public.asaas_customers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  asaas_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  email TEXT,
  cpf_cnpj TEXT,
  phone TEXT,
  external_reference TEXT,
  linked_parent_id UUID REFERENCES public.profiles(user_id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table to store all Asaas subscriptions (linked or not)
CREATE TABLE public.asaas_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  asaas_id TEXT NOT NULL UNIQUE,
  asaas_customer_id TEXT NOT NULL,
  value NUMERIC NOT NULL,
  next_due_date DATE,
  billing_cycle TEXT,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  external_reference TEXT,
  linked_child_id UUID REFERENCES public.children(id),
  linked_parent_id UUID REFERENCES public.profiles(user_id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table to store all Asaas payments (linked or not)
CREATE TABLE public.asaas_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  asaas_id TEXT NOT NULL UNIQUE,
  asaas_customer_id TEXT NOT NULL,
  asaas_subscription_id TEXT,
  value NUMERIC NOT NULL,
  net_value NUMERIC,
  due_date DATE NOT NULL,
  payment_date DATE,
  billing_type TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  description TEXT,
  invoice_url TEXT,
  bank_slip_url TEXT,
  pix_code TEXT,
  external_reference TEXT,
  linked_child_id UUID REFERENCES public.children(id),
  linked_parent_id UUID REFERENCES public.profiles(user_id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.asaas_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asaas_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asaas_payments ENABLE ROW LEVEL SECURITY;

-- Admin can manage all
CREATE POLICY "Admin can manage asaas_customers" ON public.asaas_customers FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admin can manage asaas_subscriptions" ON public.asaas_subscriptions FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admin can manage asaas_payments" ON public.asaas_payments FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Parents can view their own linked records
CREATE POLICY "Parents can view own asaas_subscriptions" ON public.asaas_subscriptions FOR SELECT
  USING (linked_parent_id = auth.uid());

CREATE POLICY "Parents can view own asaas_payments" ON public.asaas_payments FOR SELECT
  USING (linked_parent_id = auth.uid());

-- Create indexes for faster lookups
CREATE INDEX idx_asaas_customers_cpf ON public.asaas_customers(cpf_cnpj);
CREATE INDEX idx_asaas_customers_phone ON public.asaas_customers(phone);
CREATE INDEX idx_asaas_customers_email ON public.asaas_customers(email);
CREATE INDEX idx_asaas_customers_linked ON public.asaas_customers(linked_parent_id);
CREATE INDEX idx_asaas_subscriptions_customer ON public.asaas_subscriptions(asaas_customer_id);
CREATE INDEX idx_asaas_payments_customer ON public.asaas_payments(asaas_customer_id);
CREATE INDEX idx_asaas_payments_status ON public.asaas_payments(status);
CREATE INDEX idx_asaas_payments_due_date ON public.asaas_payments(due_date);

-- Trigger for updated_at
CREATE TRIGGER update_asaas_customers_updated_at
  BEFORE UPDATE ON public.asaas_customers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_asaas_subscriptions_updated_at
  BEFORE UPDATE ON public.asaas_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_asaas_payments_updated_at
  BEFORE UPDATE ON public.asaas_payments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();