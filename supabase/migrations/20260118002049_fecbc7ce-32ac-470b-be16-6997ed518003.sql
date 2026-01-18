-- Create mood enum type for daily records
CREATE TYPE public.mood_status AS ENUM ('feliz', 'calmo', 'agitado', 'choroso', 'sonolento');

-- Add mood column to daily_records table
ALTER TABLE public.daily_records 
ADD COLUMN mood public.mood_status NULL;