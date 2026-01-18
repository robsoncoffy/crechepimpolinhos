-- Create enrollment_contracts table for tracking ZapSign contracts
CREATE TABLE public.enrollment_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID REFERENCES public.children(id) ON DELETE CASCADE,
  parent_id UUID NOT NULL,
  registration_id UUID REFERENCES public.child_registrations(id) ON DELETE SET NULL,
  
  -- ZapSign data
  zapsign_doc_token TEXT,
  zapsign_signer_token TEXT,
  zapsign_doc_url TEXT,
  
  -- Status tracking
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'signed', 'refused', 'expired')),
  sent_at TIMESTAMPTZ,
  signed_at TIMESTAMPTZ,
  
  -- Contract metadata
  child_name TEXT NOT NULL,
  class_type TEXT,
  shift_type TEXT,
  plan_type TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.enrollment_contracts ENABLE ROW LEVEL SECURITY;

-- RLS policies (correct signature: has_role(user_id, role))
CREATE POLICY "Admins can manage all contracts"
ON public.enrollment_contracts FOR ALL
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Parents can view own contracts"
ON public.enrollment_contracts FOR SELECT
USING (parent_id = auth.uid());

-- Trigger for updated_at
CREATE TRIGGER update_enrollment_contracts_updated_at
BEFORE UPDATE ON public.enrollment_contracts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();