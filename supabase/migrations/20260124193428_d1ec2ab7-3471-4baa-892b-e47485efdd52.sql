-- Add quantity columns to weekly_menus table
ALTER TABLE public.weekly_menus 
ADD COLUMN IF NOT EXISTS breakfast_qty text DEFAULT '',
ADD COLUMN IF NOT EXISTS morning_snack_qty text DEFAULT '',
ADD COLUMN IF NOT EXISTS lunch_qty text DEFAULT '',
ADD COLUMN IF NOT EXISTS bottle_qty text DEFAULT '',
ADD COLUMN IF NOT EXISTS snack_qty text DEFAULT '',
ADD COLUMN IF NOT EXISTS pre_dinner_qty text DEFAULT '',
ADD COLUMN IF NOT EXISTS dinner_qty text DEFAULT '';