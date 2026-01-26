-- Create scheduled_visits table for GHL calendar integration
CREATE TABLE public.scheduled_visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ghl_appointment_id TEXT UNIQUE,
  ghl_calendar_id TEXT,
  ghl_contact_id TEXT,
  contact_name TEXT NOT NULL,
  contact_email TEXT,
  contact_phone TEXT,
  scheduled_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT,
  pre_enrollment_id UUID REFERENCES public.pre_enrollments(id) ON DELETE SET NULL,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add index for faster queries
CREATE INDEX idx_scheduled_visits_scheduled_at ON public.scheduled_visits(scheduled_at);
CREATE INDEX idx_scheduled_visits_status ON public.scheduled_visits(status);
CREATE INDEX idx_scheduled_visits_ghl_appointment_id ON public.scheduled_visits(ghl_appointment_id);

-- Enable RLS
ALTER TABLE public.scheduled_visits ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Only admins can manage visits
CREATE POLICY "Admins can manage scheduled visits"
ON public.scheduled_visits
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Staff can view scheduled visits
CREATE POLICY "Staff can view scheduled visits"
ON public.scheduled_visits
FOR SELECT
USING (is_staff(auth.uid()));

-- Add trigger for updated_at
CREATE TRIGGER update_scheduled_visits_updated_at
BEFORE UPDATE ON public.scheduled_visits
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();