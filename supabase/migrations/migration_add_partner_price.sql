-- Migration to add partner_price to products table
-- This allows setting fixed prices for VIP Partners, overriding default discounts.

ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS partner_price DECIMAL(10,2) DEFAULT NULL;

-- Optional: Add a comment to the column for clarity in Supabase Dashboard
COMMENT ON COLUMN public.products.partner_price IS 'Fixed price for VIP Partners. If NULL, default professional discounts apply.';
