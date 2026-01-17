-- Create parent invites table
CREATE TABLE public.parent_invites (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    invite_code TEXT NOT NULL UNIQUE,
    email TEXT,
    phone TEXT,
    child_name TEXT,
    notes TEXT,
    used_by UUID REFERENCES auth.users(id),
    used_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.parent_invites ENABLE ROW LEVEL SECURITY;

-- Staff can view all parent invites
CREATE POLICY "Staff can view parent invites"
ON public.parent_invites FOR SELECT
USING (public.is_staff(auth.uid()));

-- Staff can insert parent invites
CREATE POLICY "Staff can insert parent invites"
ON public.parent_invites FOR INSERT
WITH CHECK (public.is_staff(auth.uid()));

-- Staff can update parent invites
CREATE POLICY "Staff can update parent invites"
ON public.parent_invites FOR UPDATE
USING (public.is_staff(auth.uid()));

-- Staff can delete parent invites
CREATE POLICY "Staff can delete parent invites"
ON public.parent_invites FOR DELETE
USING (public.is_staff(auth.uid()));

-- Anyone can validate an invite code (needed for registration)
CREATE POLICY "Anyone can validate invite code"
ON public.parent_invites FOR SELECT
USING (used_by IS NULL AND (expires_at IS NULL OR expires_at > now()));