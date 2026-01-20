-- Create admin audit log table
CREATE TABLE public.admin_audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  admin_id UUID NOT NULL,
  admin_email TEXT,
  action_type TEXT NOT NULL,
  target_user_id UUID,
  target_email TEXT,
  details JSONB DEFAULT '{}',
  success BOOLEAN NOT NULL DEFAULT true,
  error_message TEXT
);

-- Enable RLS
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Admins can view audit logs"
  ON public.admin_audit_logs
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Only service role can insert (via edge functions)
-- No INSERT policy for authenticated users - edge function uses service role

-- Create index for faster queries
CREATE INDEX idx_admin_audit_logs_created_at ON public.admin_audit_logs(created_at DESC);
CREATE INDEX idx_admin_audit_logs_target_email ON public.admin_audit_logs(target_email);
CREATE INDEX idx_admin_audit_logs_action_type ON public.admin_audit_logs(action_type);

-- Add comment for documentation
COMMENT ON TABLE public.admin_audit_logs IS 'Audit trail for administrative actions like user deletion, email liberation, etc.';