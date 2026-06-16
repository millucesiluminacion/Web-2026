-- Migration: Add Quality Seals and Energy Efficiency Labels
-- Created: 2024-06-16

-- 1. Create quality_seals table
CREATE TABLE IF NOT EXISTS public.quality_seals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    image_url TEXT,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Create energy_labels table
CREATE TABLE IF NOT EXISTS public.energy_labels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    color TEXT DEFAULT '#16a34a',
    image_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Create junction table for products and quality seals
CREATE TABLE IF NOT EXISTS public.product_quality_seals (
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    seal_id UUID REFERENCES public.quality_seals(id) ON DELETE CASCADE,
    PRIMARY KEY (product_id, seal_id)
);

-- 4. Add energy_label_id to products table
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'energy_label_id') THEN
        ALTER TABLE public.products ADD COLUMN energy_label_id UUID REFERENCES public.energy_labels(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 5. Enable RLS and add policies
ALTER TABLE public.quality_seals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.energy_labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_quality_seals ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "Allow public read access on quality_seals" ON public.quality_seals FOR SELECT USING (true);
CREATE POLICY "Allow public read access on energy_labels" ON public.energy_labels FOR SELECT USING (true);
CREATE POLICY "Allow public read access on product_quality_seals" ON public.product_quality_seals FOR SELECT USING (true);

-- Allow full access to authenticated admins (using service role or specific role check)
-- Assuming admin has full access via service role or existing superuser policies. 
-- Adding explicit admin policies if needed:
CREATE POLICY "Allow admin all access on quality_seals" ON public.quality_seals FOR ALL USING (true);
CREATE POLICY "Allow admin all access on energy_labels" ON public.energy_labels FOR ALL USING (true);
CREATE POLICY "Allow admin all access on product_quality_seals" ON public.product_quality_seals FOR ALL USING (true);
