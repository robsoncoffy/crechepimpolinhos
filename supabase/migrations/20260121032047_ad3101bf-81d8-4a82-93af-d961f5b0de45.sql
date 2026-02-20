-- Add net_salary column to employee_profiles
ALTER TABLE public.employee_profiles 
ADD COLUMN IF NOT EXISTS net_salary numeric;

-- Add salary_payment_day to track when employees are paid
ALTER TABLE public.employee_profiles 
ADD COLUMN IF NOT EXISTS salary_payment_day integer DEFAULT 5;

-- Create fixed_expenses table for recurring bills
CREATE TABLE public.fixed_expenses (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  category text NOT NULL DEFAULT 'other',
  value numeric NOT NULL,
  due_day integer NOT NULL CHECK (due_day >= 1 AND due_day <= 31),
  is_active boolean NOT NULL DEFAULT true,
  notes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.fixed_expenses ENABLE ROW LEVEL SECURITY;

-- RLS policies for fixed_expenses
CREATE POLICY "Admins can manage fixed expenses" 
ON public.fixed_expenses 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Staff can view fixed expenses" 
ON public.fixed_expenses 
FOR SELECT 
USING (is_staff(auth.uid()));

-- Create trigger for updated_at
CREATE TRIGGER update_fixed_expenses_updated_at
BEFORE UPDATE ON public.fixed_expenses
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();