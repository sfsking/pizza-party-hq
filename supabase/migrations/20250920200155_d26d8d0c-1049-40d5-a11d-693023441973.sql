-- Add quantity column to products table
ALTER TABLE public.products 
ADD COLUMN quantity integer NOT NULL DEFAULT 0;

-- Add an index for better performance when checking availability
CREATE INDEX idx_products_quantity ON public.products(quantity);