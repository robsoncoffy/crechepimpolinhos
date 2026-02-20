-- Enable realtime for messages table
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- Add RLS policy for updating is_read status
CREATE POLICY "Users can mark messages as read" 
ON public.messages 
FOR UPDATE 
USING (parent_has_child_access(auth.uid(), child_id) OR is_staff(auth.uid()))
WITH CHECK (parent_has_child_access(auth.uid(), child_id) OR is_staff(auth.uid()));