-- Add column to link parent_invites to pre_enrollments
ALTER TABLE public.parent_invites 
ADD COLUMN IF NOT EXISTS pre_enrollment_id UUID REFERENCES public.pre_enrollments(id);

-- Add column to track which invite was created from a pre-enrollment
ALTER TABLE public.pre_enrollments 
ADD COLUMN IF NOT EXISTS converted_to_invite_id UUID REFERENCES public.parent_invites(id);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_parent_invites_pre_enrollment_id ON public.parent_invites(pre_enrollment_id);
CREATE INDEX IF NOT EXISTS idx_pre_enrollments_converted_to_invite_id ON public.pre_enrollments(converted_to_invite_id);