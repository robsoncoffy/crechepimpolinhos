-- Update is_staff function to include contador
CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('admin', 'diretor', 'teacher', 'cook', 'nutritionist', 'pedagogue', 'auxiliar', 'contador')
  )
$$;

-- Update is_hr_admin to include contador for HR data access
CREATE OR REPLACE FUNCTION public.is_hr_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = _user_id 
    AND ur.role IN ('admin', 'diretor', 'contador')
  )
$$;