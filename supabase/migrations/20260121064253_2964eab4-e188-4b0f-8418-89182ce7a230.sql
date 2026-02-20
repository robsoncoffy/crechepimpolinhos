
-- Update handle_new_user function to save CPF, RG and phone from user metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    INSERT INTO public.profiles (user_id, full_name, cpf, rg, phone, status)
    VALUES (
      NEW.id, 
      COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
      NEW.raw_user_meta_data->>'cpf',
      NEW.raw_user_meta_data->>'rg',
      NEW.raw_user_meta_data->>'phone',
      'pending'
    );
    
    -- Por padrão, novos usuários são pais (precisam aprovação)
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'parent');
    
    RETURN NEW;
END;
$function$;

-- Update existing profiles with missing data from auth.users metadata
-- This needs to be done manually via an edge function since we can't query auth.users directly in migrations
