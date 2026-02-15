-- 1. Añadir la columna correcta 'category_id' si no existe
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL;

-- 2. Intentar migrar datos (Opcional y avanzado: intentar hacer match por nombre)
-- Esto intenta buscar el ID de la categoría basándose en el nombre de texto que tenías en 'category'
UPDATE public.products
SET category_id = c.id
FROM public.categories c
WHERE lower(public.products.category) = lower(c.name);

-- 3. (Opcional) No borramos la columna 'category' todavía por seguridad, pero el código usará 'category_id'.
-- ALTER TABLE public.products DROP COLUMN category;

-- 4. Asegurar que la columna 'brand_id' existe también (por si acaso)
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS brand_id UUID REFERENCES public.brands(id) ON DELETE SET NULL;

-- 5. Recargar la caché de esquema (esto se hace automáticamente al alterar tabla, pero es bueno saberlo)
