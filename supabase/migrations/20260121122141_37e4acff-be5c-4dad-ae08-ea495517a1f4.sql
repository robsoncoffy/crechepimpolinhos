-- Create table for saved credit cards (tokenized)
CREATE TABLE public.saved_cards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  asaas_customer_id TEXT NOT NULL,
  credit_card_token TEXT NOT NULL,
  card_brand TEXT,
  last_four_digits TEXT,
  holder_name TEXT,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.saved_cards ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own saved cards"
  ON public.saved_cards
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own cards"
  ON public.saved_cards
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own cards"
  ON public.saved_cards
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own cards"
  ON public.saved_cards
  FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_saved_cards_updated_at
  BEFORE UPDATE ON public.saved_cards
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create table for payment notification log (to avoid duplicate notifications)
CREATE TABLE public.payment_notification_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  payment_asaas_id TEXT NOT NULL,
  notification_type TEXT NOT NULL, -- 'near_due', 'overdue', 'paid'
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  user_id UUID NOT NULL,
  UNIQUE(payment_asaas_id, notification_type, user_id)
);

-- Enable RLS
ALTER TABLE public.payment_notification_log ENABLE ROW LEVEL SECURITY;

-- Only allow system to manage this table (via service role)
CREATE POLICY "Service role can manage payment notifications"
  ON public.payment_notification_log
  FOR ALL
  USING (false)
  WITH CHECK (false);