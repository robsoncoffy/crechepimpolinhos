-- Create announcements table for school-wide or class-specific announcements
CREATE TABLE public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  class_type public.class_type NULL, -- NULL means all classes
  all_classes BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  starts_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- Staff can manage announcements
CREATE POLICY "Staff can manage announcements"
ON public.announcements
FOR ALL
TO authenticated
USING (public.is_staff(auth.uid()))
WITH CHECK (public.is_staff(auth.uid()));

-- Parents can view active announcements for their children's classes
CREATE POLICY "Parents can view active announcements"
ON public.announcements
FOR SELECT
TO authenticated
USING (
  is_active = true
  AND (starts_at IS NULL OR starts_at <= now())
  AND (expires_at IS NULL OR expires_at > now())
  AND (
    all_classes = true
    OR class_type IN (
      SELECT c.class_type 
      FROM children c
      INNER JOIN parent_children pc ON pc.child_id = c.id
      WHERE pc.parent_id = auth.uid()
    )
  )
);

-- Create index for efficient queries
CREATE INDEX idx_announcements_active ON public.announcements(is_active, starts_at, expires_at);
CREATE INDEX idx_announcements_class ON public.announcements(class_type) WHERE class_type IS NOT NULL;

-- Add trigger for updated_at
CREATE TRIGGER update_announcements_updated_at
  BEFORE UPDATE ON public.announcements
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();