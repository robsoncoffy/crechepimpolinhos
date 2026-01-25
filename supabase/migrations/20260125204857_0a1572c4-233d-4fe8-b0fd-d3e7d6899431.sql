-- Add email and name fields to employee_invites table
ALTER TABLE public.employee_invites 
ADD COLUMN employee_email TEXT,
ADD COLUMN employee_name TEXT;