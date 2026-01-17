-- Create a trigger function to automatically promote admin@pimpolinhos.com.br to admin
CREATE OR REPLACE FUNCTION public.promote_admin_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_email TEXT;
BEGIN
  -- Get the email from auth.users
  SELECT email INTO user_email FROM auth.users WHERE id = NEW.user_id;
  
  -- If this is the admin email, promote to admin and approve
  IF user_email = 'admin@pimpolinhos.com.br' THEN
    -- Update profile status to approved
    UPDATE public.profiles SET status = 'approved' WHERE id = NEW.id;
    
    -- Remove parent role if exists
    DELETE FROM public.user_roles WHERE user_id = NEW.user_id AND role = 'parent';
    
    -- Add admin role
    INSERT INTO public.user_roles (user_id, role) 
    VALUES (NEW.user_id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to run after profile is created
DROP TRIGGER IF EXISTS on_profile_created_promote_admin ON public.profiles;
CREATE TRIGGER on_profile_created_promote_admin
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.promote_admin_user();