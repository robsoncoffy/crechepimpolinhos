-- Create table to track read announcements by parents
CREATE TABLE public.announcement_reads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  announcement_id UUID NOT NULL REFERENCES public.announcements(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  read_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(announcement_id, user_id)
);

-- Add child_id column to announcements for per-child announcements
ALTER TABLE public.announcements 
ADD COLUMN child_id UUID REFERENCES public.children(id) ON DELETE CASCADE;

-- Enable RLS on announcement_reads
ALTER TABLE public.announcement_reads ENABLE ROW LEVEL SECURITY;

-- Parents can view their own read status
CREATE POLICY "Users can view their own announcement reads"
  ON public.announcement_reads
  FOR SELECT
  USING (auth.uid() = user_id);

-- Parents can mark announcements as read
CREATE POLICY "Users can mark announcements as read"
  ON public.announcement_reads
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Parents can delete their own read status (to mark as unread)
CREATE POLICY "Users can unmark announcements as read"
  ON public.announcement_reads
  FOR DELETE
  USING (auth.uid() = user_id);

-- Update announcements SELECT policy to include child-specific ones
DROP POLICY IF EXISTS "Parents can view active announcements for their class" ON public.announcements;

CREATE POLICY "Parents can view relevant announcements"
  ON public.announcements
  FOR SELECT
  USING (
    is_active = true 
    AND (expires_at IS NULL OR expires_at > now())
    AND (starts_at IS NULL OR starts_at <= now())
    AND (
      -- General announcements (all_classes or matching class)
      (child_id IS NULL AND (
        all_classes = true 
        OR class_type IN (
          SELECT c.class_type FROM public.children c
          INNER JOIN public.parent_children pc ON pc.child_id = c.id
          WHERE pc.parent_id = auth.uid()
        )
      ))
      -- Child-specific announcements
      OR child_id IN (
        SELECT pc.child_id FROM public.parent_children pc
        WHERE pc.parent_id = auth.uid()
      )
    )
  );

-- Enable realtime for announcement_reads
ALTER PUBLICATION supabase_realtime ADD TABLE public.announcement_reads;