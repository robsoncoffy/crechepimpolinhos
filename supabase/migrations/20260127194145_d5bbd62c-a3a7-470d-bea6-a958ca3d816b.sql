-- ===========================================
-- SECURITY FIX: Restrict access to sensitive data
-- ===========================================

-- 1. Create helper function for checking if user is HR admin
CREATE OR REPLACE FUNCTION public.is_hr_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.profiles p ON p.user_id = ur.user_id
    WHERE ur.user_id = _user_id 
    AND ur.role = 'admin'
    -- Only specific admin emails have HR access (owner/director)
    AND p.email IN ('admin@pimpolinhos.com.br', 'diretoria@pimpolinhos.com.br')
  )
$$;

-- 2. Create helper function to check if teacher has access to child's parent
CREATE OR REPLACE FUNCTION public.teacher_has_parent_access(_teacher_id uuid, _parent_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.teacher_assignments ta
    JOIN public.children c ON c.class_type = ta.class_type AND c.shift_type = ta.shift_type
    JOIN public.parent_children pc ON pc.child_id = c.id
    WHERE ta.user_id = _teacher_id
    AND pc.parent_id = _parent_id
  )
$$;

-- 3. FIX: Profiles table - restrict staff from viewing all profiles
-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Staff can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Staff can view profiles" ON public.profiles;

-- Create more restrictive policies
CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Teachers can view parents of their students"
ON public.profiles
FOR SELECT
USING (
  has_role(auth.uid(), 'teacher') 
  AND teacher_has_parent_access(auth.uid(), user_id)
);

-- 4. FIX: Employee profiles - only HR admins can view all, others view own
DROP POLICY IF EXISTS "Admin can manage all profiles" ON public.employee_profiles;
DROP POLICY IF EXISTS "Users can view own or admin can view all employee profiles" ON public.employee_profiles;

-- HR admin can view/manage all employee profiles
CREATE POLICY "HR admin can manage all employee profiles"
ON public.employee_profiles
FOR ALL
USING (is_hr_admin(auth.uid()));

-- Regular admins can only view the safe version (via view)
-- Users can always view and update their own profile
CREATE POLICY "Users can view own employee profile"
ON public.employee_profiles
FOR SELECT
USING (auth.uid() = user_id);

-- 5. FIX: Pre-enrollments - only admin can view, not all staff
DROP POLICY IF EXISTS "Staff can view pre_enrollments" ON public.pre_enrollments;
DROP POLICY IF EXISTS "Admin can manage pre_enrollments" ON public.pre_enrollments;
DROP POLICY IF EXISTS "Admins can manage pre-enrollments" ON public.pre_enrollments;

-- Only admins can manage pre-enrollments
CREATE POLICY "Admins can manage pre_enrollments"
ON public.pre_enrollments
FOR ALL
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- 6. Add comment documenting security model
COMMENT ON FUNCTION public.is_hr_admin IS 'Checks if user is an HR administrator with access to sensitive employee data (salaries, bank info). Only specific admin emails are allowed.';
COMMENT ON FUNCTION public.teacher_has_parent_access IS 'Checks if a teacher can view a parent profile based on class assignments.';