-- Añadir columna para iconos personalizados (imágenes) en categorías
ALTER TABLE public.categories 
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Nota: Asegúrate de crear un bucket en Supabase Storage llamado 'categories' con acceso público de lectura.
