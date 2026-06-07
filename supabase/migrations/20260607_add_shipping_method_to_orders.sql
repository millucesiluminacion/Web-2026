-- Migration: Add shipping_method to orders
-- Possible values: 'delivery', 'pickup'

ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS shipping_method TEXT DEFAULT 'delivery';

-- Optional: Add a check constraint to ensure valid values
ALTER TABLE public.orders 
ADD CONSTRAINT check_shipping_method 
CHECK (shipping_method IN ('delivery', 'pickup'));
