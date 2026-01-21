-- Add relationship column to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS relationship TEXT;

-- Update handle_new_user function to include relationship
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    INSERT INTO public.profiles (user_id, full_name, email, cpf, rg, phone, relationship, status)
    VALUES (
      NEW.id, 
      COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
      NEW.email,
      NEW.raw_user_meta_data->>'cpf',
      NEW.raw_user_meta_data->>'rg',
      NEW.raw_user_meta_data->>'phone',
      NEW.raw_user_meta_data->>'relationship',
      'pending'
    );
    
    -- Por padrão, novos usuários são pais (precisam aprovação)
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'parent');
    
    RETURN NEW;
END;
$function$;