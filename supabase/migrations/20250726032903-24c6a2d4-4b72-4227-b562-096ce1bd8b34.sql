-- Fix RLS recursion issue by creating a security definer function
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT AS $$
  SELECT role FROM public.profiles WHERE user_id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Add is_active field to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Create sales_reports table
CREATE TABLE IF NOT EXISTS public.sales_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  report_date DATE NOT NULL,
  total_orders INTEGER NOT NULL DEFAULT 0,
  total_revenue NUMERIC NOT NULL DEFAULT 0,
  file_path TEXT,
  report_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on sales_reports
ALTER TABLE public.sales_reports ENABLE ROW LEVEL SECURITY;

-- Create policy for sales_reports
CREATE POLICY "Admins can manage sales reports"
ON public.sales_reports
FOR ALL
USING (public.get_current_user_role() = 'admin');

-- Create product_listings table
CREATE TABLE IF NOT EXISTS public.product_listings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  listing_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  listing_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on product_listings
ALTER TABLE public.product_listings ENABLE ROW LEVEL SECURITY;

-- Create policy for product_listings
CREATE POLICY "Admins can manage product listings"
ON public.product_listings
FOR ALL
USING (public.get_current_user_role() = 'admin');

-- Update existing RLS policies to use the security definer function
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
USING (public.get_current_user_role() = 'admin' OR auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can insert profiles" ON public.profiles;
CREATE POLICY "Admins can insert profiles"
ON public.profiles
FOR INSERT
WITH CHECK (public.get_current_user_role() = 'admin');

DROP POLICY IF EXISTS "Admins can delete profiles" ON public.profiles;
CREATE POLICY "Admins can delete profiles"
ON public.profiles
FOR DELETE
USING (public.get_current_user_role() = 'admin');

-- Update products policy
DROP POLICY IF EXISTS "Admins can manage products" ON public.products;
CREATE POLICY "Admins can manage products"
ON public.products
FOR ALL
USING (public.get_current_user_role() = 'admin');

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public) 
VALUES ('sales', 'sales', false), ('listings', 'listings', false)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for sales bucket
CREATE POLICY "Admins can manage sales files"
ON storage.objects
FOR ALL
USING (bucket_id = 'sales' AND public.get_current_user_role() = 'admin');

-- Create storage policies for listings bucket
CREATE POLICY "Admins can manage listings files"
ON storage.objects
FOR ALL
USING (bucket_id = 'listings' AND public.get_current_user_role() = 'admin');