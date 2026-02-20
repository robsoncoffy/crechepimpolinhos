-- Create shopping list table for kitchen-admin sync
CREATE TABLE public.shopping_list (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  quantity TEXT NOT NULL DEFAULT '1',
  unit TEXT NOT NULL DEFAULT 'un',
  checked BOOLEAN NOT NULL DEFAULT false,
  added_by UUID REFERENCES auth.users(id),
  added_by_role TEXT NOT NULL DEFAULT 'admin',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.shopping_list ENABLE ROW LEVEL SECURITY;

-- Staff can view all shopping items
CREATE POLICY "Staff can view shopping list"
  ON public.shopping_list FOR SELECT
  USING (public.is_staff(auth.uid()));

-- Staff can insert shopping items
CREATE POLICY "Staff can insert shopping items"
  ON public.shopping_list FOR INSERT
  WITH CHECK (public.is_staff(auth.uid()));

-- Staff can update shopping items
CREATE POLICY "Staff can update shopping items"
  ON public.shopping_list FOR UPDATE
  USING (public.is_staff(auth.uid()));

-- Staff can delete shopping items
CREATE POLICY "Staff can delete shopping items"
  ON public.shopping_list FOR DELETE
  USING (public.is_staff(auth.uid()));

-- Enable realtime for sync
ALTER PUBLICATION supabase_realtime ADD TABLE public.shopping_list;

-- Add updated_at trigger
CREATE TRIGGER update_shopping_list_updated_at
  BEFORE UPDATE ON public.shopping_list
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();