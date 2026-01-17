-- Tabela para cardápio semanal
CREATE TABLE public.weekly_menus (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_start DATE NOT NULL,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 1 AND 5),
  breakfast TEXT,
  lunch TEXT,
  snack TEXT,
  dinner TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(week_start, day_of_week)
);

-- Enable RLS
ALTER TABLE public.weekly_menus ENABLE ROW LEVEL SECURITY;

-- Qualquer pessoa pode ler o cardápio
CREATE POLICY "Anyone can read menus" ON public.weekly_menus
  FOR SELECT USING (true);

-- Apenas staff pode gerenciar cardápios
CREATE POLICY "Staff can insert menus" ON public.weekly_menus
  FOR INSERT WITH CHECK (public.is_staff(auth.uid()));

CREATE POLICY "Staff can update menus" ON public.weekly_menus
  FOR UPDATE USING (public.is_staff(auth.uid()));

CREATE POLICY "Staff can delete menus" ON public.weekly_menus
  FOR DELETE USING (public.is_staff(auth.uid()));

-- Trigger para atualizar updated_at
CREATE TRIGGER update_weekly_menus_updated_at
  BEFORE UPDATE ON public.weekly_menus
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();