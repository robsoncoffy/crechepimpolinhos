-- Create table for staff chat rooms/groups
CREATE TABLE public.staff_chat_rooms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  is_general BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for staff messages
CREATE TABLE public.staff_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES public.staff_chat_rooms(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.staff_chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_messages ENABLE ROW LEVEL SECURITY;

-- Staff can view all chat rooms
CREATE POLICY "Staff can view chat rooms"
ON public.staff_chat_rooms
FOR SELECT
TO authenticated
USING (public.is_staff(auth.uid()));

-- Only admins can create chat rooms
CREATE POLICY "Admins can create chat rooms"
ON public.staff_chat_rooms
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Staff can view messages in rooms
CREATE POLICY "Staff can view messages"
ON public.staff_messages
FOR SELECT
TO authenticated
USING (public.is_staff(auth.uid()));

-- Staff can send messages
CREATE POLICY "Staff can send messages"
ON public.staff_messages
FOR INSERT
TO authenticated
WITH CHECK (public.is_staff(auth.uid()) AND auth.uid() = sender_id);

-- Staff can update their own messages
CREATE POLICY "Staff can update own messages"
ON public.staff_messages
FOR UPDATE
TO authenticated
USING (auth.uid() = sender_id);

-- Enable realtime for staff messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.staff_messages;

-- Insert default general chat room
INSERT INTO public.staff_chat_rooms (name, description, is_general)
VALUES ('Geral', 'Chat geral da equipe', true);

-- Create trigger for updated_at
CREATE TRIGGER update_staff_chat_rooms_updated_at
BEFORE UPDATE ON public.staff_chat_rooms
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();