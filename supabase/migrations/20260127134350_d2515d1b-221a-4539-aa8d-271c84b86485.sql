-- Add new class_type values to the enum
ALTER TYPE public.class_type ADD VALUE IF NOT EXISTS 'maternal_1';
ALTER TYPE public.class_type ADD VALUE IF NOT EXISTS 'maternal_2';
ALTER TYPE public.class_type ADD VALUE IF NOT EXISTS 'jardim_1';
ALTER TYPE public.class_type ADD VALUE IF NOT EXISTS 'jardim_2';