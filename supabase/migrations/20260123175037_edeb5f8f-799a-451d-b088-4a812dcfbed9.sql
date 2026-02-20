-- Add cpf column to pre_enrollments table
ALTER TABLE public.pre_enrollments 
ADD COLUMN cpf TEXT;