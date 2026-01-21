-- Tighten overly permissive RLS policy on pre_enrollments (INSERT)
DROP POLICY IF EXISTS "Anyone can create pre-enrollment" ON public.pre_enrollments;
CREATE POLICY "Anyone can create pre-enrollment"
ON public.pre_enrollments
FOR INSERT
WITH CHECK (
  parent_name IS NOT NULL AND btrim(parent_name) <> '' AND
  email IS NOT NULL AND btrim(email) <> '' AND
  phone IS NOT NULL AND btrim(phone) <> '' AND
  child_name IS NOT NULL AND btrim(child_name) <> '' AND
  child_birth_date IS NOT NULL AND
  desired_class_type IS NOT NULL AND
  desired_shift_type IS NOT NULL AND
  status = 'pending'
);
