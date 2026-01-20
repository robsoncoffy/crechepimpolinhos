-- Create employee_absences table for managing vacations and leaves
CREATE TABLE public.employee_absences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL CHECK (type IN ('ferias', 'licenca', 'atestado', 'falta', 'folga')),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  notes TEXT,
  approved_by UUID REFERENCES auth.users(id),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.employee_absences ENABLE ROW LEVEL SECURITY;

-- Admins can manage all absences
CREATE POLICY "Admins can manage absences" ON public.employee_absences
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Users can view their own absences
CREATE POLICY "Users can view own absences" ON public.employee_absences
  FOR SELECT USING (employee_id = auth.uid());

-- Users can request absences for themselves
CREATE POLICY "Users can request absences" ON public.employee_absences
  FOR INSERT WITH CHECK (employee_id = auth.uid());

-- Create trigger for updated_at
CREATE TRIGGER update_employee_absences_updated_at
  BEFORE UPDATE ON public.employee_absences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add index for faster queries
CREATE INDEX idx_employee_absences_employee ON public.employee_absences(employee_id);
CREATE INDEX idx_employee_absences_dates ON public.employee_absences(start_date, end_date);
CREATE INDEX idx_employee_absences_status ON public.employee_absences(status);