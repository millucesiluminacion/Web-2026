-- Performance Improvement: Indices
-- Run this in the Supabase SQL Editor

-- 1. Index for Category Filtering
CREATE INDEX IF NOT EXISTS products_category_id_idx ON public.products(category_id);

-- 2. Index for Brand Filtering
CREATE INDEX IF NOT EXISTS products_brand_id_idx ON public.products(brand_id);

-- 3. Index for Room Filtering
CREATE INDEX IF NOT EXISTS products_room_id_idx ON public.products(room_id);

-- 4. GIN Index for JSONB Attributes (Crucial for generic filters like Power, Color, etc.)
CREATE INDEX IF NOT EXISTS products_attributes_gin_idx ON public.products USING GIN (attributes);

-- 5. Index for "Newest First" sorting
CREATE INDEX IF NOT EXISTS products_created_at_idx ON public.products(created_at DESC);

-- 6. Index for Price sorting
CREATE INDEX IF NOT EXISTS products_price_idx ON public.products(price);
