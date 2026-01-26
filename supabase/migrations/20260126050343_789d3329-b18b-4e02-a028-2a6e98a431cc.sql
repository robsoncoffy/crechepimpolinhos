-- Extend email_logs table for detailed GHL logging
ALTER TABLE public.email_logs 
ADD COLUMN IF NOT EXISTS provider TEXT DEFAULT 'gmail',
ADD COLUMN IF NOT EXISTS ghl_contact_id TEXT,
ADD COLUMN IF NOT EXISTS ghl_message_id TEXT,
ADD COLUMN IF NOT EXISTS template_type TEXT,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS error_message TEXT,
ADD COLUMN IF NOT EXISTS metadata JSONB,
ADD COLUMN IF NOT EXISTS request_id TEXT;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_email_logs_provider ON public.email_logs(provider);
CREATE INDEX IF NOT EXISTS idx_email_logs_status ON public.email_logs(status);
CREATE INDEX IF NOT EXISTS idx_email_logs_template_type ON public.email_logs(template_type);
CREATE INDEX IF NOT EXISTS idx_email_logs_request_id ON public.email_logs(request_id);