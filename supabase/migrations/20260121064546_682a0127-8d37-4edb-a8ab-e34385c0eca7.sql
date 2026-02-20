
-- Add email column to profiles table if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'email'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN email TEXT;
  END IF;
END $$;

-- Update handle_new_user function to also save email
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    INSERT INTO public.profiles (user_id, full_name, email, cpf, rg, phone, status)
    VALUES (
      NEW.id, 
      COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
      NEW.email,
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
