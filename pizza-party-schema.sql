-- =============================================
-- Pizza Party HQ - Full Schema (from backup)
-- =============================================

-- Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  role TEXT DEFAULT 'employee' CHECK (role IN ('employee', 'admin')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create products table
CREATE TABLE IF NOT EXISTS public.products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  image_url TEXT,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create orders table
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  order_type TEXT NOT NULL CHECK (order_type IN ('dine_in', 'delivery')),
  table_number INTEGER,
  customer_name TEXT,
  customer_address TEXT,
  customer_location TEXT,
  total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create order_items table
CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  subtotal DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

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

-- Create product_listings table
CREATE TABLE IF NOT EXISTS public.product_listings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  listing_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  listing_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create auto_report_settings table
CREATE TABLE IF NOT EXISTS public.auto_report_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  report_time TIME NOT NULL DEFAULT '00:00:00',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auto_report_settings ENABLE ROW LEVEL SECURITY;

-- Security definer function to get current user role
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT role FROM public.profiles WHERE user_id = auth.uid() AND is_active = true LIMIT 1;
$$;

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
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

-- Trigger to create profile on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Timestamp update triggers
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_products_updated_at ON public.products;
CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_orders_updated_at ON public.orders;
CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_auto_report_settings_updated_at ON public.auto_report_settings;
CREATE TRIGGER update_auto_report_settings_updated_at
  BEFORE UPDATE ON public.auto_report_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles"
ON public.profiles FOR SELECT
USING (public.get_current_user_role() = 'admin' OR auth.uid() = user_id);

CREATE POLICY "Admins can insert profiles"
ON public.profiles FOR INSERT
WITH CHECK (public.get_current_user_role() = 'admin');

CREATE POLICY "Admins can delete profiles"
ON public.profiles FOR DELETE
USING (public.get_current_user_role() = 'admin');

-- RLS Policies for products
CREATE POLICY "Everyone can view active products"
ON public.products FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can manage products"
ON public.products FOR ALL
USING (public.get_current_user_role() = 'admin');

-- RLS Policies for orders
CREATE POLICY "Employees can view all orders"
ON public.orders FOR SELECT
USING (EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Employees can create orders"
ON public.orders FOR INSERT
WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND id = employee_id));

CREATE POLICY "Employees can update their own orders"
ON public.orders FOR UPDATE
USING (EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND id = employee_id));

-- RLS Policies for order_items
CREATE POLICY "Employees can view order items"
ON public.order_items FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.orders o
  JOIN public.profiles p ON o.employee_id = p.id
  WHERE o.id = order_id AND p.user_id = auth.uid()
));

CREATE POLICY "Employees can manage order items"
ON public.order_items FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.orders o
  JOIN public.profiles p ON o.employee_id = p.id
  WHERE o.id = order_id AND p.user_id = auth.uid()
));

-- RLS Policies for sales_reports
CREATE POLICY "Admins can manage sales reports"
ON public.sales_reports FOR ALL
USING (public.get_current_user_role() = 'admin');

-- RLS Policies for product_listings
CREATE POLICY "Admins can manage product listings"
ON public.product_listings FOR ALL
USING (public.get_current_user_role() = 'admin');

-- RLS Policies for auto_report_settings
CREATE POLICY "Admins can manage auto report settings"
ON public.auto_report_settings FOR ALL
USING (public.get_current_user_role() = 'admin');

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public)
VALUES ('sales', 'sales', false), ('listings', 'listings', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Admins can manage sales files"
ON storage.objects FOR ALL
USING (bucket_id = 'sales' AND public.get_current_user_role() = 'admin');

CREATE POLICY "Admins can manage listings files"
ON storage.objects FOR ALL
USING (bucket_id = 'listings' AND public.get_current_user_role() = 'admin');

-- Insert sample products
INSERT INTO public.products (name, price, image_url, description) VALUES
('Margherita Pizza', 12.99, 'https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?w=300', 'Classic pizza with tomato sauce, mozzarella, and basil'),
('Pepperoni Pizza', 14.99, 'https://images.unsplash.com/photo-1628840042765-356cda07504e?w=300', 'Pizza topped with pepperoni and mozzarella cheese'),
('Hawaiian Pizza', 15.99, 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8aGF3YWlpYW4lMjBwaXp6YXxlbnwwfHwwfHx8MA%3D%3D', 'Pizza with ham, pineapple, and mozzarella cheese'),
('BBQ Chicken Pizza', 16.99, 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=300', 'Pizza with BBQ sauce, chicken, red onions, and cilantro'),
('Garlic Bread', 6.99, 'https://images.unsplash.com/photo-1573140401552-3fab0b24306f?q=80&w=870&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D', 'Fresh baked bread with garlic butter and herbs'),
('Caesar Salad', 8.99, 'https://images.unsplash.com/photo-1546793665-c74683f339c1?w=300', 'Crisp romaine lettuce with caesar dressing and croutons'),
('Chicken Wings', 11.99, 'https://images.unsplash.com/photo-1608039755401-742074f0548d?w=300', 'Spicy buffalo wings served with ranch dressing'),
('Soda', 2.99, 'https://images.unsplash.com/photo-1629203851122-3726ecdf080e?w=300', 'Refreshing soft drinks - Coke, Pepsi, Sprite');
