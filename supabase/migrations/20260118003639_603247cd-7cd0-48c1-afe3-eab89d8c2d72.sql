-- Add new roles to the app_role enum (must be committed before use)
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'cook';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'nutritionist';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'pedagogue';