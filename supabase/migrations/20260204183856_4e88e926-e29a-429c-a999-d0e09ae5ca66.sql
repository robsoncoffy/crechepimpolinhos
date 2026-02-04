-- Table to store starred/important conversations (local feature, not in GHL)
CREATE TABLE IF NOT EXISTS public.ghl_starred_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  contact_id TEXT NOT NULL,
  starred_by UUID NOT NULL,
  starred_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(conversation_id, starred_by)
);

-- Enable RLS
ALTER TABLE public.ghl_starred_conversations ENABLE ROW LEVEL SECURITY;

-- Staff can manage their own starred conversations
CREATE POLICY "Staff can manage own starred" ON public.ghl_starred_conversations
  FOR ALL USING (
    starred_by = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'teacher', 'auxiliar', 'nutritionist', 'pedagogue', 'cook', 'contador')
    )
  );

-- Index for fast lookups
CREATE INDEX idx_ghl_starred_by_user ON public.ghl_starred_conversations(starred_by);
CREATE INDEX idx_ghl_starred_conversation ON public.ghl_starred_conversations(conversation_id);