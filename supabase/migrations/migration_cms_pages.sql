-- Create cms_pages table
CREATE TABLE IF NOT EXISTS cms_pages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    content JSONB NOT NULL DEFAULT '{}',
    meta_title TEXT,
    meta_description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE cms_pages ENABLE ROW LEVEL SECURITY;

-- Policies for public reading
CREATE POLICY "Public pages are viewable by everyone" 
ON cms_pages FOR SELECT 
USING (is_active = true);

-- Policies for admin management
CREATE POLICY "Admins can manage cms_pages" 
ON cms_pages FOR ALL 
USING (EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('admin', 'manager', 'editor')
));

-- Function to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_cms_pages_updated_at
    BEFORE UPDATE ON cms_pages
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();
