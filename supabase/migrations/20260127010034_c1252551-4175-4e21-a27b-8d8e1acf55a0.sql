-- 1. Create a safe view for employee profiles (excludes sensitive data)
CREATE OR REPLACE VIEW public.employee_profiles_safe
WITH (security_invoker = on) AS
SELECT 
  id,
  user_id,
  full_name,
  photo_url,
  phone,
  birth_date,
  job_title,
  work_shift,
  hire_date,
  education_level,
  specialization,
  emergency_contact_name,
  emergency_contact_phone,
  city,
  state,
  created_at,
  updated_at
  -- Excluded: cpf, rg, salary, net_salary, bank info, pis_pasep, ctps, voter info, full address
FROM public.employee_profiles;

-- 2. Grant access to the view
GRANT SELECT ON public.employee_profiles_safe TO authenticated;

-- 3. Add comment for documentation
COMMENT ON VIEW public.employee_profiles_safe IS 'Safe view excluding sensitive financial and personal data. Full data only accessible by admins via employee_profiles table.';