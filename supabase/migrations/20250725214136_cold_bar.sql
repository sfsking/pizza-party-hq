/*
  # Fix RLS Policies and Create Admin Account

  1. Database Changes
    - Fix RLS policies to prevent recursion
    - Create preset admin account
    - Add proper role management

  2. Security
    - Remove circular dependencies in RLS policies
    - Create secure admin role system
    - Add proper authentication flow
*/

-- First, drop existing problematic policies
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can delete profiles" ON profiles;

-- Create a simpler, non-recursive admin check function
CREATE OR REPLACE FUNCTION is_admin(user_uuid uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = user_uuid AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create new non-recursive RLS policies
CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (is_admin(auth.uid()));

CREATE POLICY "Admins can insert profiles"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can update all profiles"
  ON profiles FOR UPDATE
  TO authenticated
  USING (is_admin(auth.uid()));

CREATE POLICY "Admins can delete profiles"
  ON profiles FOR DELETE
  TO authenticated
  USING (is_admin(auth.uid()));

-- Create the preset admin account
DO $$
DECLARE
  admin_user_id uuid;
BEGIN
  -- Create the admin user in auth.users
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'sifee1200@gmail.com',
    crypt('qwertyu123', gen_salt('bf')),
    now(),
    now(),
    now(),
    '',
    '',
    '',
    ''
  )
  ON CONFLICT (email) DO NOTHING
  RETURNING id INTO admin_user_id;

  -- If user was created, get the ID
  IF admin_user_id IS NULL THEN
    SELECT id INTO admin_user_id FROM auth.users WHERE email = 'sifee1200@gmail.com';
  END IF;

  -- Create or update the profile
  INSERT INTO profiles (user_id, email, full_name, role)
  VALUES (admin_user_id, 'sifee1200@gmail.com', 'System Administrator', 'admin')
  ON CONFLICT (user_id) DO UPDATE SET
    role = 'admin',
    full_name = 'System Administrator';
END $$;

-- Add employee status column for soft deletion
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

-- Create sales tracking table
CREATE TABLE IF NOT EXISTS sales_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_date date NOT NULL,
  total_orders integer DEFAULT 0,
  total_revenue numeric(10,2) DEFAULT 0,
  report_data jsonb,
  file_path text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE sales_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage sales reports"
  ON sales_reports FOR ALL
  TO authenticated
  USING (is_admin(auth.uid()));

-- Create product listings table for file management
CREATE TABLE IF NOT EXISTS product_listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_name text NOT NULL,
  file_path text,
  listing_data jsonb,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE product_listings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage product listings"
  ON product_listings FOR ALL
  TO authenticated
  USING (is_admin(auth.uid()));

-- Add triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_sales_reports_updated_at 
  BEFORE UPDATE ON sales_reports 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_product_listings_updated_at 
  BEFORE UPDATE ON product_listings 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();