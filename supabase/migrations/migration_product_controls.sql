-- Add fields for per-meter sales and mandatory accessories
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS is_by_meter BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS min_meters NUMERIC DEFAULT 1,
ADD COLUMN IF NOT EXISTS max_meters NUMERIC DEFAULT 100,
ADD COLUMN IF NOT EXISTS meter_step NUMERIC DEFAULT 1,
ADD COLUMN IF NOT EXISTS mandatory_accessory_ids UUID[] DEFAULT '{}';

-- Index for searchable array
CREATE INDEX IF NOT EXISTS idx_products_mandatory_accessories ON products USING GIN (mandatory_accessory_ids);
