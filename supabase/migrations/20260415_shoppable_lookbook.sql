-- Migration: Add Shoppable Lookbook features to projects
ALTER TABLE projects ADD COLUMN IF NOT EXISTS hotspots JSONB DEFAULT '[]'::jsonb;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS extra_images JSONB DEFAULT '[]'::jsonb;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS description_rich TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS related_product_ids UUID[] DEFAULT '{}';

-- Optional: Rename "projects" to "inspiration" in the future if desired, 
-- but for now we keep the table name for stability.
