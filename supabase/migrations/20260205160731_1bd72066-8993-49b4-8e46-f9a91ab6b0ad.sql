-- Add class_type and shift_type columns to child_registrations
ALTER TABLE public.child_registrations 
ADD COLUMN IF NOT EXISTS class_type TEXT,
ADD COLUMN IF NOT EXISTS shift_type TEXT;