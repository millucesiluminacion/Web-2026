-- Create many-to-many relationship table for categories
CREATE TABLE IF NOT EXISTS public.category_relationships (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    child_id UUID REFERENCES public.categories(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES public.categories(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(child_id, parent_id)
);

-- Enable RLS
ALTER TABLE public.category_relationships ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Public Read Access" ON public.category_relationships FOR SELECT USING (true);

-- Admin access (Anon for dev, following local patterns)
CREATE POLICY "Anon Full Access" ON public.category_relationships FOR ALL USING (true) WITH CHECK (true);

-- Migrate existing parent_id data
INSERT INTO public.category_relationships (child_id, parent_id)
SELECT id, parent_id 
FROM public.categories 
WHERE parent_id IS NOT NULL
ON CONFLICT (child_id, parent_id) DO NOTHING;

-- Comment for clarity
COMMENT ON TABLE public.category_relationships IS 'Supports many-to-many relationships between categories (subcategories with multiple parents).';
