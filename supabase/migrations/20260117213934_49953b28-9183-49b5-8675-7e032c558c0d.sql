-- Tabela para galeria de fotos
CREATE TABLE public.gallery_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  photo_url TEXT NOT NULL,
  class_type public.class_type,
  child_id UUID REFERENCES public.children(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela para eventos da escola
CREATE TABLE public.school_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  event_date DATE NOT NULL,
  event_type TEXT NOT NULL DEFAULT 'event' CHECK (event_type IN ('holiday', 'meeting', 'event', 'celebration')),
  class_type public.class_type,
  all_classes BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela para inscrições de notificações push
CREATE TABLE public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.gallery_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Políticas para galeria de fotos
CREATE POLICY "Parents can view photos for their children classes" ON public.gallery_photos
  FOR SELECT USING (
    -- Staff can see all
    is_staff(auth.uid()) OR
    -- Parents can see photos for their child's class or specific to their child
    EXISTS (
      SELECT 1 FROM public.parent_children pc
      JOIN public.children c ON c.id = pc.child_id
      WHERE pc.parent_id = auth.uid()
      AND (
        gallery_photos.child_id = c.id OR
        gallery_photos.class_type = c.class_type OR
        gallery_photos.class_type IS NULL
      )
    )
  );

CREATE POLICY "Staff can insert photos" ON public.gallery_photos
  FOR INSERT WITH CHECK (is_staff(auth.uid()));

CREATE POLICY "Staff can update photos" ON public.gallery_photos
  FOR UPDATE USING (is_staff(auth.uid()));

CREATE POLICY "Staff can delete photos" ON public.gallery_photos
  FOR DELETE USING (is_staff(auth.uid()));

-- Políticas para eventos
CREATE POLICY "Anyone can view events" ON public.school_events
  FOR SELECT USING (true);

CREATE POLICY "Staff can insert events" ON public.school_events
  FOR INSERT WITH CHECK (is_staff(auth.uid()));

CREATE POLICY "Staff can update events" ON public.school_events
  FOR UPDATE USING (is_staff(auth.uid()));

CREATE POLICY "Staff can delete events" ON public.school_events
  FOR DELETE USING (is_staff(auth.uid()));

-- Políticas para push subscriptions
CREATE POLICY "Users can manage own subscriptions" ON public.push_subscriptions
  FOR ALL USING (auth.uid() = user_id);

-- Triggers para updated_at
CREATE TRIGGER update_gallery_photos_updated_at
  BEFORE UPDATE ON public.gallery_photos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_school_events_updated_at
  BEFORE UPDATE ON public.school_events
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Criar bucket de storage para fotos da galeria
INSERT INTO storage.buckets (id, name, public) 
VALUES ('gallery-photos', 'gallery-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas de storage para galeria
CREATE POLICY "Anyone can view gallery photos" ON storage.objects
  FOR SELECT USING (bucket_id = 'gallery-photos');

CREATE POLICY "Staff can upload gallery photos" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'gallery-photos' AND is_staff(auth.uid()));

CREATE POLICY "Staff can delete gallery photos" ON storage.objects
  FOR DELETE USING (bucket_id = 'gallery-photos' AND is_staff(auth.uid()));