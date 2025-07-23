-- Create profiles table for employee information
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  role TEXT DEFAULT 'employee' CHECK (role IN ('employee', 'admin')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create products table for food items
CREATE TABLE public.products (
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
CREATE TABLE public.orders (
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
CREATE TABLE public.order_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  subtotal DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile" 
ON public.profiles FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" 
ON public.profiles FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles" 
ON public.profiles FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Admins can insert profiles" 
ON public.profiles FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Admins can delete profiles" 
ON public.profiles FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- RLS Policies for products
CREATE POLICY "Everyone can view active products" 
ON public.products FOR SELECT 
USING (is_active = true);

CREATE POLICY "Admins can manage products" 
ON public.products FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- RLS Policies for orders
CREATE POLICY "Employees can view all orders" 
ON public.orders FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Employees can create orders" 
ON public.orders FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND id = employee_id
  )
);

CREATE POLICY "Employees can update their own orders" 
ON public.orders FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND id = employee_id
  )
);

-- RLS Policies for order_items
CREATE POLICY "Employees can view order items" 
ON public.order_items FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.orders o
    JOIN public.profiles p ON o.employee_id = p.id
    WHERE o.id = order_id AND p.user_id = auth.uid()
  )
);

CREATE POLICY "Employees can manage order items" 
ON public.order_items FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.orders o
    JOIN public.profiles p ON o.employee_id = p.id
    WHERE o.id = order_id AND p.user_id = auth.uid()
  )
);

-- Function to automatically create profile for new users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for timestamp updates
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert sample products
INSERT INTO public.products (name, price, image_url, description) VALUES
('Margherita Pizza', 12.99, 'https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?w=300', 'Classic pizza with tomato sauce, mozzarella, and basil'),
('Pepperoni Pizza', 14.99, 'https://images.unsplash.com/photo-1628840042765-356cda07504e?w=300', 'Pizza topped with pepperoni and mozzarella cheese'),
('Hawaiian Pizza', 15.99, 'https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=300', 'Pizza with ham, pineapple, and mozzarella cheese'),
('BBQ Chicken Pizza', 16.99, 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=300', 'Pizza with BBQ sauce, chicken, red onions, and cilantro'),
('Garlic Bread', 6.99, 'https://images.unsplash.com/photo-1573140247632-f8fd74997d5c?w=300', 'Fresh baked bread with garlic butter and herbs'),
('Caesar Salad', 8.99, 'https://images.unsplash.com/photo-1546793665-c74683f339c1?w=300', 'Crisp romaine lettuce with caesar dressing and croutons'),
('Chicken Wings', 11.99, 'https://images.unsplash.com/photo-1608039755401-742074f0548d?w=300', 'Spicy buffalo wings served with ranch dressing'),
('Soda', 2.99, 'https://images.unsplash.com/photo-1629203851122-3726ecdf080e?w=300', 'Refreshing soft drinks - Coke, Pepsi, Sprite');

-- Create admin user profile (will be linked when admin signs up)
-- The admin will need to sign up with email: sifee1200@gmail.com