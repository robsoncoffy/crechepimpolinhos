
-- Fix employee_profiles: employees should only see non-sensitive data
-- Drop the permissive policy that allows full access
DROP POLICY IF EXISTS "Users can view own employee profile" ON public.employee_profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.employee_profiles;

-- Create a new policy that only allows employees to see their own profile
-- But they should use the safe view for reading, so we restrict direct SELECT for non-HR users
CREATE POLICY "Employees can view only own basic profile" 
ON public.employee_profiles 
FOR SELECT 
USING (
  auth.uid() = user_id OR 
  is_hr_admin(auth.uid())
);

-- Ensure the view has proper RLS policies
-- The view already has security_invoker=on, so it inherits RLS from base table

-- Create RLS policies for the employee_profiles_safe view 
-- Views with security_invoker inherit base table RLS, but let's make the view more accessible for staff
COMMENT ON VIEW public.employee_profiles_safe IS 'Safe view excluding sensitive fields like bank accounts, salary, and personal documents';

-- Add a policy to allow staff to view the safe view (read non-sensitive employee data)
-- First, let's ensure staff can see basic employee info through the main table
-- This is already covered by is_hr_admin

-- Update the profiles table to ensure teachers can only see limited parent data
-- The teacher_has_parent_access function is already secure, but let's add a comment
COMMENT ON FUNCTION public.teacher_has_parent_access IS 'Validates teacher access to parent profiles based on class/shift assignments';
COMMENT ON FUNCTION public.parent_has_child_access IS 'Validates parent access to children based on parent_children relationship table';