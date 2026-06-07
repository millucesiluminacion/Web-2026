-- Add fields for per-measurement sales
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS is_by_measurement BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS measurements JSONB DEFAULT '[]';

-- Comment for clarity
COMMENT ON COLUMN products.measurements IS 'Array of objects: [{"measure": "50cm", "price": 10.00}]';
