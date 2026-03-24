-- Add slug column to products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;

-- Function to generate slug
CREATE OR REPLACE FUNCTION generate_slug(name TEXT) RETURNS TEXT AS $$
BEGIN
  RETURN lower(regexp_replace(name, '[^a-zA-Z0-9]+', '-', 'g'));
END;
$$ LANGUAGE plpgsql;

-- Populate existing slugs
UPDATE products SET slug = generate_slug(name) || '-' || substr(id::text, 1, 4) WHERE slug IS NULL;
