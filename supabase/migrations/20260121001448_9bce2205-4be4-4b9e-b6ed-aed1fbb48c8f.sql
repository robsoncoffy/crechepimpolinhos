-- Update the notify_teachers_on_pickup function to handle 'other_person' type
CREATE OR REPLACE FUNCTION public.notify_teachers_on_pickup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  child_record RECORD;
  teacher_record RECORD;
  notification_title TEXT;
  notification_message TEXT;
  parent_name TEXT;
BEGIN
  -- Get child information
  SELECT full_name, class_type INTO child_record
  FROM public.children
  WHERE id = NEW.child_id;

  -- Get parent name
  SELECT full_name INTO parent_name
  FROM public.profiles
  WHERE user_id = NEW.parent_id;

  -- Build notification title and message based on type
  IF NEW.notification_type = 'on_way' THEN
    notification_title := '🚗 Busca a caminho: ' || split_part(child_record.full_name, ' ', 1);
    notification_message := COALESCE(parent_name, 'Responsável') || ' está a caminho para buscar ' || split_part(child_record.full_name, ' ', 1) || '. Prepare o bilhetinho da escola!';
  ELSIF NEW.notification_type = 'delay' THEN
    notification_title := '⏰ Atraso na busca: ' || split_part(child_record.full_name, ' ', 1);
    notification_message := COALESCE(parent_name, 'Responsável') || ' vai atrasar ' || COALESCE(NEW.delay_minutes::text, '?') || ' minutos para buscar ' || split_part(child_record.full_name, ' ', 1) || '.';
  ELSIF NEW.notification_type = 'other_person' THEN
    notification_title := '👤 Outra pessoa: ' || split_part(child_record.full_name, ' ', 1);
    notification_message := COALESCE(NEW.message, 'Outra pessoa autorizada') || ' irá buscar ' || split_part(child_record.full_name, ' ', 1) || '.';
  ELSE
    notification_title := '📢 Aviso de busca: ' || split_part(child_record.full_name, ' ', 1);
    notification_message := COALESCE(NEW.message, 'Aviso sobre busca de ') || split_part(child_record.full_name, ' ', 1);
  END IF;

  -- Notify all teachers (they can filter by class in their UI)
  FOR teacher_record IN
    SELECT ur.user_id
    FROM public.user_roles ur
    WHERE ur.role = 'teacher'
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
      'pickup',
      '/painel/agenda'
    );
  END LOOP;

  RETURN NEW;
END;
$$;