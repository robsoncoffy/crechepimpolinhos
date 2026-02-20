-- Add column to store pre-calculated nutrition data for each menu entry
ALTER TABLE public.weekly_menus 
ADD COLUMN IF NOT EXISTS nutrition_data JSONB DEFAULT NULL;

-- Add comment explaining the column
COMMENT ON COLUMN public.weekly_menus.nutrition_data IS 'Pre-calculated nutrition totals per meal to avoid re-processing on load. Format: { breakfast: {...totals}, lunch: {...totals}, ... }';