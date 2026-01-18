-- Add fields to staff_chat_rooms to support private chats
ALTER TABLE public.staff_chat_rooms 
ADD COLUMN IF NOT EXISTS is_private boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS participant_1 uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS participant_2 uuid REFERENCES auth.users(id);

-- Create index for faster private chat lookups
CREATE INDEX IF NOT EXISTS idx_staff_chat_rooms_participants 
ON public.staff_chat_rooms (participant_1, participant_2) 
WHERE is_private = true;

-- Update RLS policies to allow access to private chats
DROP POLICY IF EXISTS "Staff can view chat rooms" ON public.staff_chat_rooms;
CREATE POLICY "Staff can view accessible chat rooms" ON public.staff_chat_rooms
FOR SELECT TO authenticated
USING (
  public.is_staff(auth.uid()) AND (
    is_private = false 
    OR participant_1 = auth.uid() 
    OR participant_2 = auth.uid()
  )
);

-- Allow staff to create rooms (admins for groups, anyone for private)
DROP POLICY IF EXISTS "Staff can create rooms" ON public.staff_chat_rooms;
CREATE POLICY "Staff can create rooms" ON public.staff_chat_rooms
FOR INSERT TO authenticated
WITH CHECK (
  public.is_staff(auth.uid()) AND (
    -- Admins can create any room
    public.has_role(auth.uid(), 'admin')
    -- Or anyone can create private chats where they are a participant
    OR (is_private = true AND (participant_1 = auth.uid() OR participant_2 = auth.uid()))
  )
);

-- Allow admins to delete group rooms
CREATE POLICY "Admins can delete group rooms" ON public.staff_chat_rooms
FOR DELETE TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') AND is_private = false AND is_general = false
);

-- Update messages policy to allow access to private chat messages
DROP POLICY IF EXISTS "Staff can view messages" ON public.staff_messages;
CREATE POLICY "Staff can view accessible messages" ON public.staff_messages
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.staff_chat_rooms r
    WHERE r.id = room_id AND (
      (r.is_private = false AND public.is_staff(auth.uid()))
      OR r.participant_1 = auth.uid()
      OR r.participant_2 = auth.uid()
    )
  )
);