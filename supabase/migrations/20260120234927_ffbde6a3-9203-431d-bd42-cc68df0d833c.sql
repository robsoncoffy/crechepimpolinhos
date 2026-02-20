-- Add menu_type column to differentiate between nursery and toddler menus
ALTER TABLE public.weekly_menus 
ADD COLUMN IF NOT EXISTS menu_type TEXT NOT NULL DEFAULT 'maternal';

-- Add check constraint for valid menu types
ALTER TABLE public.weekly_menus
ADD CONSTRAINT weekly_menus_menu_type_check CHECK (menu_type IN ('bercario', 'maternal'));

-- Update existing records to maternal (default)
UPDATE public.weekly_menus SET menu_type = 'maternal' WHERE menu_type IS NULL OR menu_type = '';

-- Create unique constraint to prevent duplicate menu entries for same day/week/type
ALTER TABLE public.weekly_menus
DROP CONSTRAINT IF EXISTS weekly_menus_week_day_type_unique;

ALTER TABLE public.weekly_menus
ADD CONSTRAINT weekly_menus_week_day_type_unique UNIQUE (week_start, day_of_week, menu_type);