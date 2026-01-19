-- Create teacher_assignments table to link teachers to their classes
CREATE TABLE public.teacher_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  class_type public.class_type NOT NULL,
  shift_type public.shift_type NOT NULL,
  is_primary BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, class_type, shift_type)
);

-- Enable RLS
ALTER TABLE public.teacher_assignments ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can manage all teacher assignments"
ON public.teacher_assignments
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Teachers can view their own assignments"
ON public.teacher_assignments
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Update trigger for updated_at
CREATE TRIGGER update_teacher_assignments_updated_at
BEFORE UPDATE ON public.teacher_assignments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add comment
COMMENT ON TABLE public.teacher_assignments IS 'Links teachers to their assigned classes and shifts';