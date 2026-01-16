-- Create pre-enrollments table for storing pre-registration submissions
CREATE TABLE public.pre_enrollments (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    parent_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    child_name TEXT NOT NULL,
    child_birth_date DATE NOT NULL,
    desired_class_type public.class_type NOT NULL,
    desired_shift_type public.shift_type NOT NULL,
    how_heard_about TEXT,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'contacted', 'enrolled', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.pre_enrollments ENABLE ROW LEVEL SECURITY;

-- Admins can see all pre-enrollments
CREATE POLICY "Admins can view all pre-enrollments"
ON public.pre_enrollments
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Admins can update pre-enrollments
CREATE POLICY "Admins can update pre-enrollments"
ON public.pre_enrollments
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

-- Anyone can submit a pre-enrollment (public form)
CREATE POLICY "Anyone can create pre-enrollment"
ON public.pre_enrollments
FOR INSERT
WITH CHECK (true);

-- Add trigger for updated_at
CREATE TRIGGER update_pre_enrollments_updated_at
BEFORE UPDATE ON public.pre_enrollments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();