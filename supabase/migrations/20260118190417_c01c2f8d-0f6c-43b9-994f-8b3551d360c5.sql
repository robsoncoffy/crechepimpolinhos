-- Create quarterly evaluations table for Plus+ students
CREATE TABLE public.quarterly_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  pedagogue_id UUID NOT NULL,
  quarter INTEGER NOT NULL CHECK (quarter >= 1 AND quarter <= 4),
  year INTEGER NOT NULL,
  
  -- Evaluation areas
  cognitive_development TEXT,
  motor_development TEXT,
  social_emotional TEXT,
  language_development TEXT,
  creativity_arts TEXT,
  
  -- Summary and recommendations
  overall_summary TEXT,
  recommendations TEXT,
  next_steps TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Ensure unique evaluation per child per quarter per year
  UNIQUE (child_id, quarter, year)
);

-- Enable RLS
ALTER TABLE public.quarterly_evaluations ENABLE ROW LEVEL SECURITY;

-- Pedagogue can manage all evaluations
CREATE POLICY "Pedagogues can manage evaluations"
ON public.quarterly_evaluations
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'pedagogue') OR public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'pedagogue') OR public.has_role(auth.uid(), 'admin'));

-- Parents can view their Plus+ children's evaluations
CREATE POLICY "Parents can view Plus+ child evaluations"
ON public.quarterly_evaluations
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.parent_children pc
    JOIN public.children c ON c.id = pc.child_id
    WHERE pc.parent_id = auth.uid()
    AND pc.child_id = quarterly_evaluations.child_id
    AND c.plan_type = 'plus'
  )
);

-- Add channel type to messages table for separating school and nutritionist chats
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS channel_type TEXT DEFAULT 'school' CHECK (channel_type IN ('school', 'nutritionist'));

-- Update existing messages to have school channel
UPDATE public.messages SET channel_type = 'school' WHERE channel_type IS NULL;

-- Trigger for updated_at
CREATE TRIGGER update_quarterly_evaluations_updated_at
BEFORE UPDATE ON public.quarterly_evaluations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();