-- 1. Añadir jerarquía y soporte de iconos a la tabla de categorías
ALTER TABLE public.categories 
ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS icon_name TEXT;

-- 2. Crear índice para mejorar el rendimiento de búsqueda de subcategorías
CREATE INDEX IF NOT EXISTS categories_parent_id_idx ON public.categories(parent_id);

-- 3. Insertar Subcategorías de ejemplo para "Downlights"
-- Primero obtenemos el ID de Downlights (asumiendo que existe por el seeder)
DO $$
DECLARE
    downlights_id UUID;
BEGIN
    SELECT id INTO downlights_id FROM public.categories WHERE slug = 'downlights' LIMIT 1;
    
    IF downlights_id IS NOT NULL THEN
        -- Empotrables
        INSERT INTO public.categories (name, slug, description, parent_id, icon_name, order_index)
        VALUES ('Empotrables', 'downlights-empotrables', 'Downlights para empotrar en techo.', downlights_id, 'BoxSelect', 0)
        ON CONFLICT (slug) DO UPDATE SET parent_id = downlights_id, icon_name = 'BoxSelect';
        
        -- Superficie
        INSERT INTO public.categories (name, slug, description, parent_id, icon_name, order_index)
        VALUES ('Superficie', 'downlights-superficie', 'Downlights para instalación en superficie.', downlights_id, 'Square', 1)
        ON CONFLICT (slug) DO UPDATE SET parent_id = downlights_id, icon_name = 'Square';
        
        -- Paneles Grandes
        INSERT INTO public.categories (name, slug, description, parent_id, icon_name, order_index)
        VALUES ('Paneles Grandes', 'paneles-grandes', 'Paneles LED de gran formato.', downlights_id, 'Grid', 2)
        ON CONFLICT (slug) DO UPDATE SET parent_id = downlights_id, icon_name = 'Grid';
    END IF;
END $$;
