-- Create function to notify admins
CREATE OR REPLACE FUNCTION public.notify_admins(
  _title TEXT,
  _message TEXT,
  _type TEXT,
  _link TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO notifications (user_id, title, message, type, link)
  SELECT user_id, _title, _message, _type, _link
  FROM user_roles
  WHERE role = 'admin';
END;
$$;

-- Trigger for new child registrations
CREATE OR REPLACE FUNCTION public.notify_admin_new_registration()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM notify_admins(
    '📝 Nova Matrícula',
    'Nova solicitação de matrícula: ' || NEW.first_name || ' ' || NEW.last_name,
    'new_registration',
    '/painel/pre-matriculas'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_new_registration
  AFTER INSERT ON public.child_registrations
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_admin_new_registration();

-- Trigger for new contact submissions
CREATE OR REPLACE FUNCTION public.notify_admin_new_contact()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM notify_admins(
    '📧 Nova Mensagem',
    'Nova mensagem de contato de: ' || NEW.name,
    'new_contact',
    '/painel/contatos'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_new_contact
  AFTER INSERT ON public.contact_submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_admin_new_contact();

-- Trigger for new employee absence requests
CREATE OR REPLACE FUNCTION public.notify_admin_new_absence()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  employee_name TEXT;
BEGIN
  SELECT full_name INTO employee_name 
  FROM profiles 
  WHERE user_id = NEW.employee_id;
  
  PERFORM notify_admins(
    '🏥 Solicitação de Ausência',
    COALESCE(employee_name, 'Funcionário') || ' solicitou ' || NEW.type,
    'absence_request',
    '/painel/ausencias'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_new_absence_request
  AFTER INSERT ON public.employee_absences
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_admin_new_absence();

-- Trigger for parent approval needed (new profile created with parent role)
CREATE OR REPLACE FUNCTION public.notify_admin_pending_approval()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_parent BOOLEAN;
BEGIN
  -- Check if this is a parent needing approval
  SELECT EXISTS(
    SELECT 1 FROM user_roles 
    WHERE user_id = NEW.user_id AND role = 'parent'
  ) INTO is_parent;
  
  IF is_parent AND NEW.status = 'pending' THEN
    PERFORM notify_admins(
      '👤 Novo Responsável',
      'Novo responsável aguardando aprovação: ' || NEW.full_name,
      'pending_approval',
      '/painel/aprovacoes'
    );
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_profile_pending_approval
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_admin_pending_approval();

-- Trigger for new messages from parents
CREATE OR REPLACE FUNCTION public.notify_staff_new_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sender_name TEXT;
  child_name TEXT;
  is_parent BOOLEAN;
BEGIN
  -- Check if sender is parent
  SELECT EXISTS(
    SELECT 1 FROM user_roles 
    WHERE user_id = NEW.sender_id AND role = 'parent'
  ) INTO is_parent;
  
  IF is_parent THEN
    SELECT full_name INTO sender_name FROM profiles WHERE user_id = NEW.sender_id;
    SELECT full_name INTO child_name FROM children WHERE id = NEW.child_id;
    
    -- Notify admins and teachers
    INSERT INTO notifications (user_id, title, message, type, link)
    SELECT user_id, 
           '💬 Nova Mensagem',
           COALESCE(sender_name, 'Responsável') || ' enviou mensagem sobre ' || COALESCE(child_name, 'aluno'),
           'new_parent_message',
           '/painel/mensagens'
    FROM user_roles
    WHERE role IN ('admin', 'teacher');
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_new_parent_message
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_staff_new_message();

-- Trigger for new pickup history (child picked up)
CREATE OR REPLACE FUNCTION public.notify_parent_child_picked_up()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  child_name TEXT;
  parent_record RECORD;
BEGIN
  SELECT full_name INTO child_name FROM children WHERE id = NEW.child_id;
  
  -- Notify all parents of this child
  FOR parent_record IN 
    SELECT parent_id FROM parent_children WHERE child_id = NEW.child_id
  LOOP
    INSERT INTO notifications (user_id, title, message, type, link)
    VALUES (
      parent_record.parent_id,
      '🚗 Criança Retirada',
      COALESCE(child_name, 'Seu filho(a)') || ' foi retirado(a) por ' || COALESCE(NEW.picked_up_by, 'responsável'),
      'child_pickup',
      '/painel-pais'
    );
  END LOOP;
  
  RETURN NEW;
END;
$$;

-- Only create trigger if pickup_history table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pickup_history') THEN
    CREATE TRIGGER on_child_pickup
      AFTER INSERT ON public.pickup_history
      FOR EACH ROW
      EXECUTE FUNCTION public.notify_parent_child_picked_up();
  END IF;
END $$;