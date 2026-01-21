-- Create school_feed table for posts/updates
CREATE TABLE public.school_feed (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  content TEXT NOT NULL,
  image_url TEXT,
  class_type public.class_type,
  all_classes BOOLEAN DEFAULT true,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.school_feed ENABLE ROW LEVEL SECURITY;

-- Staff can manage all posts
CREATE POLICY "Staff can manage feed posts"
ON public.school_feed
FOR ALL
USING (is_staff(auth.uid()))
WITH CHECK (is_staff(auth.uid()));

-- Parents can view posts relevant to their children's classes
CREATE POLICY "Parents can view relevant feed posts"
ON public.school_feed
FOR SELECT
USING (
  all_classes = true 
  OR class_type IN (
    SELECT c.class_type 
    FROM children c
    JOIN parent_children pc ON pc.child_id = c.id
    WHERE pc.parent_id = auth.uid()
  )
);

-- Create index for better performance
CREATE INDEX idx_school_feed_created_at ON public.school_feed(created_at DESC);
CREATE INDEX idx_school_feed_class_type ON public.school_feed(class_type);

-- Add trigger for updated_at
CREATE TRIGGER update_school_feed_updated_at
BEFORE UPDATE ON public.school_feed
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();