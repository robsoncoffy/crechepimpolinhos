-- Drop the old constraint that doesn't include menu_type
ALTER TABLE public.weekly_menus 
DROP CONSTRAINT IF EXISTS weekly_menus_week_start_day_of_week_key;