-- Add retry tracking columns to email_logs
ALTER TABLE public.email_logs 
ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS max_retries INTEGER DEFAULT 3,
ADD COLUMN IF NOT EXISTS next_retry_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS last_retry_at TIMESTAMP WITH TIME ZONE;

-- Create index for efficient retry queries
CREATE INDEX IF NOT EXISTS idx_email_logs_retry 
ON public.email_logs (status, next_retry_at) 
WHERE status = 'error' AND retry_count < max_retries;