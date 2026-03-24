-- 1. Asegurar corrección de category_id (Redundancia de seguridad)
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL;

-- 2. Añadir soporte para Variantes (Relación Padre/Hijo)
-- Si parent_id es NULL, es un producto principal.
-- Si parent_id tiene valor, es una variante de ese producto.
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES public.products(id) ON DELETE CASCADE;

-- 3. Añadir columna de atributos (JSONB) para flexibilidad total
-- Ejemplo: {"Color": "Rojo", "Talla": "XL", "Potencia": "12W"}
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS attributes JSONB DEFAULT '{}'::jsonb;

-- 4. Crear índice para mejorar rendimiento al buscar variantes de un producto
CREATE INDEX IF NOT EXISTS products_parent_id_idx ON public.products(parent_id);

-- 5. Política RLS (Row Level Security) - Asegurar que las variantes sean visibles
-- (Las políticas existentes de 'products' deberían cubrirlo, pero verificamos)
-- Si ya tienes "Public Read Access" on products, esto funcionará para las variantes también.
