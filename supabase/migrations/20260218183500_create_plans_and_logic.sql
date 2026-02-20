-- Create enum for plan types if it doesn't exist
DO $$ BEGIN
    CREATE TYPE plan_type AS ENUM ('basico', 'intermediario', 'plus');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create enum for class types if it doesn't exist (optional, but good for validation)
-- We will use text for flexibility but validating against known types is better
-- 'bercario' | 'maternal' | 'maternal_1' | 'maternal_2' | 'jardim' | 'jardim_1' | 'jardim_2'

-- Create plans table
CREATE TABLE IF NOT EXISTS public.plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_type TEXT NOT NULL,
    plan_type plan_type NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    description TEXT,
    features JSONB,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(class_type, plan_type)
);

-- Enable RLS
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

-- Allow public read access to plans
CREATE POLICY "Public plans are viewable by everyone" 
ON public.plans FOR SELECT 
USING (true);

-- Allow admins to insert/update (assuming admin role check exists, otherwise safe default for now is service_role only or authenticated if needed)
-- For now, we'll keep it simple: read-only for public, write for service_role

-- Insert initial data based on current pricing
INSERT INTO public.plans (class_type, plan_type, price, description) VALUES
-- Berçário
('bercario', 'basico', 799.90, 'Meio Período (Berçário)'),
('bercario', 'intermediario', 1299.90, 'Integral (Berçário)'),
('bercario', 'plus', 1699.90, 'Integral Plus (Berçário)'),
-- Maternal
('maternal', 'basico', 799.90, 'Meio Período (Maternal)'),
('maternal', 'intermediario', 1299.90, 'Integral (Maternal)'),
('maternal', 'plus', 1699.90, 'Integral Plus (Maternal)'),
-- Maternal I
('maternal_1', 'basico', 799.90, 'Meio Período (Maternal I)'),
('maternal_1', 'intermediario', 1299.90, 'Integral (Maternal I)'),
('maternal_1', 'plus', 1699.90, 'Integral Plus (Maternal I)'),
-- Maternal II
('maternal_2', 'basico', 749.90, 'Meio Período (Maternal II)'),
('maternal_2', 'intermediario', 1099.90, 'Integral (Maternal II)'),
('maternal_2', 'plus', 1699.90, 'Integral Plus (Maternal II)'),
-- Jardim
('jardim', 'basico', 649.90, 'Meio Período (Jardim)'),
-- Jardim I
('jardim_1', 'basico', 649.90, 'Meio Período (Jardim I)'),
-- Jardim II
('jardim_2', 'basico', 649.90, 'Meio Período (Jardim II)')
ON CONFLICT (class_type, plan_type) DO UPDATE 
SET price = EXCLUDED.price;

-- Create function to calculate class type based on birth date (Centralized Logic)
CREATE OR REPLACE FUNCTION public.get_suggested_class_type(birth_date DATE, reference_date DATE DEFAULT CURRENT_DATE)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
    months INTEGER;
    age_interval INTERVAL;
    years_diff INTEGER;
    months_diff INTEGER;
BEGIN
    -- Calculate age in months
    -- Logic: (year_diff * 12) + month_diff. Adjust if day is essentially "before" birth day in the month
    
    age_interval := age(reference_date, birth_date);
    years_diff := date_part('year', age_interval);
    months_diff := date_part('month', age_interval);
    
    months := (years_diff * 12) + months_diff;

    -- Berçário: 0-2 anos (0-23 meses)
    IF months < 24 THEN
        RETURN 'bercario';
    -- Maternal I: 2-3 anos (24-35 meses)
    ELSIF months < 36 THEN
        RETURN 'maternal_1';
    -- Maternal II: 3-4 anos (36-47 meses)
    ELSIF months < 48 THEN
        RETURN 'maternal_2';
    -- Jardim I: 4-5 anos (48-59 meses)
    ELSIF months < 60 THEN
        RETURN 'jardim_1';
    -- Jardim II: 5-6 anos (60+ meses)
    ELSE
        RETURN 'jardim_2';
    END IF;
END;
$$;
