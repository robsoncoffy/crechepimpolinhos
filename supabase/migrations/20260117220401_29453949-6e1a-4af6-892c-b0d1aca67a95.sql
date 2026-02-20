-- Create attendance table for daily roll call
CREATE TABLE public.attendance (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    child_id UUID NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    status TEXT NOT NULL CHECK (status IN ('present', 'absent', 'late', 'excused')),
    arrival_time TIME,
    departure_time TIME,
    notes TEXT,
    recorded_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(child_id, date)
);

-- Enable RLS
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

-- Staff can view all attendance
CREATE POLICY "Staff can view all attendance"
ON public.attendance FOR SELECT
USING (public.is_staff(auth.uid()));

-- Staff can insert attendance
CREATE POLICY "Staff can insert attendance"
ON public.attendance FOR INSERT
WITH CHECK (public.is_staff(auth.uid()));

-- Staff can update attendance
CREATE POLICY "Staff can update attendance"
ON public.attendance FOR UPDATE
USING (public.is_staff(auth.uid()));

-- Parents can view their children's attendance
CREATE POLICY "Parents can view their children attendance"
ON public.attendance FOR SELECT
USING (public.parent_has_child_access(auth.uid(), child_id));

-- Add trigger for updated_at
CREATE TRIGGER update_attendance_updated_at
BEFORE UPDATE ON public.attendance
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.attendance;