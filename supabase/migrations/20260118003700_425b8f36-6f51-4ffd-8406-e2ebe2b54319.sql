-- Create table for weekly activity planning (Pedagogue)
CREATE TABLE public.weekly_activity_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    week_start DATE NOT NULL,
    class_type public.class_type NOT NULL,
    day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 4),
    morning_activities TEXT,
    afternoon_activities TEXT,
    materials_needed TEXT,
    learning_objectives TEXT,
    notes TEXT,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(week_start, class_type, day_of_week)
);

-- Enable RLS
ALTER TABLE public.weekly_activity_plans ENABLE ROW LEVEL SECURITY;

-- Policies for weekly_activity_plans
CREATE POLICY "Pedagogue can manage activity plans"
ON public.weekly_activity_plans
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'pedagogue') OR public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'pedagogue') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Staff can view activity plans"
ON public.weekly_activity_plans
FOR SELECT
TO authenticated
USING (public.is_staff(auth.uid()));

-- Create table for meal tracking by cook
CREATE TABLE public.meal_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    child_id UUID REFERENCES public.children(id) ON DELETE CASCADE NOT NULL,
    meal_date DATE NOT NULL DEFAULT CURRENT_DATE,
    breakfast_served BOOLEAN DEFAULT FALSE,
    breakfast_time TIMESTAMP WITH TIME ZONE,
    morning_snack_served BOOLEAN DEFAULT FALSE,
    morning_snack_time TIMESTAMP WITH TIME ZONE,
    lunch_served BOOLEAN DEFAULT FALSE,
    lunch_time TIMESTAMP WITH TIME ZONE,
    afternoon_snack_served BOOLEAN DEFAULT FALSE,
    afternoon_snack_time TIMESTAMP WITH TIME ZONE,
    dinner_served BOOLEAN DEFAULT FALSE,
    dinner_time TIMESTAMP WITH TIME ZONE,
    special_diet_notes TEXT,
    recorded_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(child_id, meal_date)
);

-- Enable RLS
ALTER TABLE public.meal_tracking ENABLE ROW LEVEL SECURITY;

-- Policies for meal_tracking
CREATE POLICY "Cook can manage meal tracking"
ON public.meal_tracking
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'cook') OR public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'cook') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Staff can view meal tracking"
ON public.meal_tracking
FOR SELECT
TO authenticated
USING (public.is_staff(auth.uid()));

-- Add special milk and diet info to children table
ALTER TABLE public.children 
ADD COLUMN IF NOT EXISTS special_milk TEXT,
ADD COLUMN IF NOT EXISTS dietary_restrictions TEXT,
ADD COLUMN IF NOT EXISTS food_preferences TEXT;

-- Trigger for updated_at on new tables
CREATE TRIGGER update_weekly_activity_plans_updated_at
BEFORE UPDATE ON public.weekly_activity_plans
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_meal_tracking_updated_at
BEFORE UPDATE ON public.meal_tracking
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();