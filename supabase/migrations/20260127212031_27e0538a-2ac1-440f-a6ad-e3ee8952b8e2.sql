-- Create table to track WhatsApp messages with retry capabilities
CREATE TABLE public.whatsapp_message_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ghl_contact_id TEXT,
  ghl_message_id TEXT,
  phone TEXT NOT NULL,
  message_preview TEXT,
  template_type TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  retry_count INTEGER NOT NULL DEFAULT 0,
  max_retries INTEGER NOT NULL DEFAULT 3,
  next_retry_at TIMESTAMPTZ,
  last_retry_at TIMESTAMPTZ,
  error_message TEXT,
  metadata JSONB,
  parent_invite_id UUID,
  pre_enrollment_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.whatsapp_message_logs ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admins can manage whatsapp logs"
ON public.whatsapp_message_logs
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Staff can view whatsapp logs"
ON public.whatsapp_message_logs
FOR SELECT
USING (is_staff(auth.uid()));

-- Create indexes for efficient queries
CREATE INDEX idx_whatsapp_logs_status ON public.whatsapp_message_logs(status);
CREATE INDEX idx_whatsapp_logs_next_retry ON public.whatsapp_message_logs(next_retry_at) WHERE status IN ('pending', 'sent', 'error');
CREATE INDEX idx_whatsapp_logs_ghl_message_id ON public.whatsapp_message_logs(ghl_message_id);
CREATE INDEX idx_whatsapp_logs_phone ON public.whatsapp_message_logs(phone);

-- Create trigger for updated_at
CREATE TRIGGER update_whatsapp_message_logs_updated_at
BEFORE UPDATE ON public.whatsapp_message_logs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add comment
COMMENT ON TABLE public.whatsapp_message_logs IS 'Tracks WhatsApp messages sent via GHL with retry capabilities';