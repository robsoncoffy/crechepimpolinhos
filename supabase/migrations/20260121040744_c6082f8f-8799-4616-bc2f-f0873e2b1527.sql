-- Drop and recreate the function to fix the notification link
CREATE OR REPLACE FUNCTION public.notify_teachers_on_parent_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  child_record RECORD;
  teacher_record RECORD;
  parent_name TEXT;
  notification_title TEXT;
  notification_message TEXT;
  notification_link TEXT;
BEGIN
  -- Only trigger for school channel messages
  IF NEW.channel_type != 'school' THEN
    RETURN NEW;
  END IF;

  -- Check if sender is a parent (not staff)
  IF EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = NEW.sender_id 
    AND role IN ('admin', 'teacher', 'cook', 'nutritionist', 'pedagogue', 'auxiliar')
  ) THEN
    RETURN NEW;
  END IF;

  -- Get child info
  SELECT id, full_name, class_type, shift_type INTO child_record
  FROM public.children
  WHERE id = NEW.child_id;

  -- Get parent name
  SELECT full_name INTO parent_name
  FROM public.profiles
  WHERE user_id = NEW.sender_id;

  -- Build notification
  notification_title := '💬 Nova mensagem: ' || split_part(child_record.full_name, ' ', 1);
  notification_message := COALESCE(parent_name, 'Responsável') || ': ' || LEFT(NEW.content, 100);
  notification_link := '/painel/mensagens?child=' || child_record.id::text;

  -- Notify teachers assigned to this child's class
  FOR teacher_record IN
    SELECT ta.user_id
    FROM public.teacher_assignments ta
    WHERE ta.class_type = child_record.class_type
    AND ta.shift_type = child_record.shift_type
  LOOP
    -- Create in-app notification
    INSERT INTO public.notifications (
      user_id,
      title,
      message,
      type,
      link
    ) VALUES (
      teacher_record.user_id,
      notification_title,
      notification_message,
      'message',
      notification_link
    );
  END LOOP;

  -- Also notify admins
  FOR teacher_record IN
    SELECT ur.user_id
    FROM public.user_roles ur
    WHERE ur.role = 'admin'
  LOOP
    INSERT INTO public.notifications (
      user_id,
      title,
      message,
      type,
      link
    ) VALUES (
      teacher_record.user_id,
      notification_title,
      notification_message,
      'message',
      notification_link
    );
  END LOOP;

  RETURN NEW;
END;
$$;