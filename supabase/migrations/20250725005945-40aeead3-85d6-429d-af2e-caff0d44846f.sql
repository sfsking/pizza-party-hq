-- Update the first user to be an admin
-- This assumes the first registered user should be the admin
UPDATE public.profiles 
SET role = 'admin' 
WHERE user_id = (
  SELECT user_id 
  FROM public.profiles 
  ORDER BY created_at ASC 
  LIMIT 1
);