-- Create pickup notifications table
CREATE TABLE public.pickup_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  child_id UUID NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  parent_id UUID NOT NULL,
  notification_type TEXT NOT NULL CHECK (notification_type IN ('on_way', 'delay')),
  delay_minutes INTEGER,
  message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  read_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- Enable RLS
ALTER TABLE public.pickup_notifications ENABLE ROW LEVEL SECURITY;

-- Parents can create their own notifications
CREATE POLICY "Parents can create pickup notifications" 
ON public.pickup_notifications 
FOR INSERT 
WITH CHECK (auth.uid() = parent_id);

-- Parents can view their own notifications
CREATE POLICY "Parents can view their own notifications" 
ON public.pickup_notifications 
FOR SELECT 
USING (auth.uid() = parent_id);

-- Staff can view all notifications
CREATE POLICY "Staff can view all notifications" 
ON public.pickup_notifications 
FOR SELECT 
USING (public.is_staff(auth.uid()));

-- Staff can update notifications (mark as read)
CREATE POLICY "Staff can update notifications" 
ON public.pickup_notifications 
FOR UPDATE 
USING (public.is_staff(auth.uid()));

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.pickup_notifications;