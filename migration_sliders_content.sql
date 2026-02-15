-- Migración para añadir campos de personalización a los sliders
ALTER TABLE public.sliders 
ADD COLUMN IF NOT EXISTS subtitle TEXT,
ADD COLUMN IF NOT EXISTS button_text TEXT DEFAULT 'Ver Más',
ADD COLUMN IF NOT EXISTS secondary_button_text TEXT,
ADD COLUMN IF NOT EXISTS secondary_button_link TEXT;

-- Comentario para el usuario:
-- Por favor, ejecuta este script en el SQL Editor de Supabase para habilitar los textos dinámicos en los banners.
