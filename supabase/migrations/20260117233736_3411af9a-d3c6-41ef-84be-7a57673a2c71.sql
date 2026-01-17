-- Create enum for plan types (Básico, Intermediário, Plus+)
CREATE TYPE public.plan_type AS ENUM ('basico', 'intermediario', 'plus');

-- Add plan_type column to child_registrations (for pending registrations)
ALTER TABLE public.child_registrations 
ADD COLUMN plan_type public.plan_type NULL;

-- Add plan_type column to children (for approved children)
ALTER TABLE public.children 
ADD COLUMN plan_type public.plan_type NULL;