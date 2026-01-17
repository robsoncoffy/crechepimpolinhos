-- Create table for guardian invitations
CREATE TABLE public.guardian_invitations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  child_registration_id UUID NOT NULL REFERENCES public.child_registrations(id) ON DELETE CASCADE,
  invited_by UUID NOT NULL,
  invited_email TEXT NOT NULL,
  invited_name TEXT NOT NULL,
  relationship TEXT NOT NULL DEFAULT 'Responsável',
  token UUID NOT NULL DEFAULT gen_random_uuid(),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_by UUID,
  accepted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.guardian_invitations ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view invitations they created
CREATE POLICY "Users can view their sent invitations"
ON public.guardian_invitations
FOR SELECT
USING (auth.uid() = invited_by);

-- Policy: Users can view invitations sent to their email
CREATE POLICY "Users can view invitations for their email"
ON public.guardian_invitations
FOR SELECT
USING (
  invited_email = (SELECT email FROM auth.users WHERE id = auth.uid())
);

-- Policy: Users can create invitations for their child registrations
CREATE POLICY "Users can create invitations for their registrations"
ON public.guardian_invitations
FOR INSERT
WITH CHECK (
  invited_by = auth.uid() AND
  EXISTS (
    SELECT 1 FROM public.child_registrations 
    WHERE id = child_registration_id AND parent_id = auth.uid()
  )
);

-- Policy: Users can update their own invitations (cancel)
CREATE POLICY "Users can update their sent invitations"
ON public.guardian_invitations
FOR UPDATE
USING (auth.uid() = invited_by);

-- Policy: Invited users can accept invitations
CREATE POLICY "Invited users can accept invitations"
ON public.guardian_invitations
FOR UPDATE
USING (
  invited_email = (SELECT email FROM auth.users WHERE id = auth.uid()) AND
  status = 'pending'
);

-- Create index for faster lookup by token
CREATE INDEX idx_guardian_invitations_token ON public.guardian_invitations(token);
CREATE INDEX idx_guardian_invitations_email ON public.guardian_invitations(invited_email);

-- Trigger to update updated_at
CREATE TRIGGER update_guardian_invitations_updated_at
BEFORE UPDATE ON public.guardian_invitations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();