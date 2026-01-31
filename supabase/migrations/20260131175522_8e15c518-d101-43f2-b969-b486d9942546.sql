-- Update is_hr_admin function to include diretor role with admin powers
CREATE OR REPLACE FUNCTION public.is_hr_admin(_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = _user_id 
    AND ur.role IN ('admin', 'diretor')
  )
$function$;