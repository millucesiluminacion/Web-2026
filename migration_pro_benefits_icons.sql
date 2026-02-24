-- Añadir soporte para iconos personalizados (imágenes) en beneficios profesionales
ALTER TABLE public.pro_benefits 
ADD COLUMN IF NOT EXISTS image_url TEXT;
