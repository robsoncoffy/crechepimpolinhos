-- Update is_staff function to include diretor role
CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('admin', 'diretor', 'teacher', 'cook', 'nutritionist', 'pedagogue', 'auxiliar')
  )
$function$;