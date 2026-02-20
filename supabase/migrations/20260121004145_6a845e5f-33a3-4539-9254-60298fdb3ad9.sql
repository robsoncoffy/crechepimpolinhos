-- Add time fields for each meal
ALTER TABLE weekly_menus 
ADD COLUMN IF NOT EXISTS breakfast_time TEXT,
ADD COLUMN IF NOT EXISTS morning_snack TEXT,
ADD COLUMN IF NOT EXISTS morning_snack_time TEXT,
ADD COLUMN IF NOT EXISTS lunch_time TEXT,
ADD COLUMN IF NOT EXISTS bottle TEXT,
ADD COLUMN IF NOT EXISTS bottle_time TEXT,
ADD COLUMN IF NOT EXISTS snack_time TEXT,
ADD COLUMN IF NOT EXISTS pre_dinner TEXT,
ADD COLUMN IF NOT EXISTS pre_dinner_time TEXT,
ADD COLUMN IF NOT EXISTS dinner_time TEXT;

-- Add comments to explain the fields
COMMENT ON COLUMN weekly_menus.breakfast_time IS 'Horário do café da manhã';
COMMENT ON COLUMN weekly_menus.morning_snack IS 'Lanche da manhã (berçário)';
COMMENT ON COLUMN weekly_menus.morning_snack_time IS 'Horário do lanche da manhã';
COMMENT ON COLUMN weekly_menus.lunch_time IS 'Horário do almoço';
COMMENT ON COLUMN weekly_menus.bottle IS 'Mamadeira (berçário)';
COMMENT ON COLUMN weekly_menus.bottle_time IS 'Horário da mamadeira';
COMMENT ON COLUMN weekly_menus.snack_time IS 'Horário do lanche da tarde';
COMMENT ON COLUMN weekly_menus.pre_dinner IS 'Pré-janta (berçário)';
COMMENT ON COLUMN weekly_menus.pre_dinner_time IS 'Horário da pré-janta';
COMMENT ON COLUMN weekly_menus.dinner_time IS 'Horário do jantar';