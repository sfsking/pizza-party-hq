-- Fix RLS recursion issue by updating the security definer function
DROP FUNCTION IF EXISTS public.get_current_user_role();

CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT 
LANGUAGE SQL 
SECURITY DEFINER 
STABLE
AS $$
  SELECT role FROM public.profiles WHERE user_id = auth.uid() AND is_active = true LIMIT 1;
$$;

-- Recreate RLS policies to avoid recursion
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can delete profiles" ON public.profiles;

-- Create non-recursive RLS policies
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p2 
    WHERE p2.user_id = auth.uid() 
    AND p2.role = 'admin' 
    AND p2.is_active = true
  )
);

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can insert profiles" 
ON public.profiles 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p2 
    WHERE p2.user_id = auth.uid() 
    AND p2.role = 'admin' 
    AND p2.is_active = true
  )
);

CREATE POLICY "Admins can update profiles" 
ON public.profiles 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p2 
    WHERE p2.user_id = auth.uid() 
    AND p2.role = 'admin' 
    AND p2.is_active = true
  )
);

CREATE POLICY "Admins can delete profiles" 
ON public.profiles 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p2 
    WHERE p2.user_id = auth.uid() 
    AND p2.role = 'admin' 
    AND p2.is_active = true
  )
);

-- Ensure the handle_new_user function includes is_active
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name, role, is_active)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    'employee',
    true
  );
  RETURN NEW;
END;
$$;