-- Add all roles to robsonccr@gmail.com user for full dashboard access
DO $$
DECLARE
  target_user_id UUID;
BEGIN
  -- Get the user_id from auth.users
  SELECT id INTO target_user_id 
  FROM auth.users 
  WHERE email = 'robsonccr@gmail.com';
  
  IF target_user_id IS NOT NULL THEN
    -- Add all roles (ignore if already exists)
    INSERT INTO public.user_roles (user_id, role) 
    VALUES 
      (target_user_id, 'admin'),
      (target_user_id, 'teacher'),
      (target_user_id, 'parent'),
      (target_user_id, 'cook'),
      (target_user_id, 'nutritionist'),
      (target_user_id, 'pedagogue'),
      (target_user_id, 'auxiliar')
    ON CONFLICT (user_id, role) DO NOTHING;
    
    -- Also approve the profile
    UPDATE public.profiles 
    SET status = 'approved' 
    WHERE user_id = target_user_id;
    
    RAISE NOTICE 'All roles added to user %', target_user_id;
  ELSE
    RAISE NOTICE 'User robsonccr@gmail.com not found. They need to register first.';
  END IF;
END $$;