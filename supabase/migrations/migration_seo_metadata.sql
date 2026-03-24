-- Migración para el Centro de Control SEO Integral
-- Añade campos de metadatos a las tablas principales y crea site_settings

-- 1. Ampliar tablas existentes
ALTER TABLE products ADD COLUMN IF NOT EXISTS meta_title TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS meta_description TEXT;

ALTER TABLE categories ADD COLUMN IF NOT EXISTS meta_title TEXT;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS meta_description TEXT;

ALTER TABLE rooms ADD COLUMN IF NOT EXISTS meta_title TEXT;
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS meta_description TEXT;

ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS meta_title TEXT;
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS meta_description TEXT;

-- 2. Crear tabla de configuración global
CREATE TABLE IF NOT EXISTS site_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Insertar configuración SEO inicial para la Home
INSERT INTO site_settings (key, value)
VALUES (
    'seo_global',
    '{
        "home_title": "Mil Luces | Boutique de Iluminación Exclusiva",
        "home_description": "Descubre nuestra colección de iluminación de lujo. Tiras LED, lamparas de diseño y soluciones profesionales para arquitectos e interioristas.",
        "og_image": "",
        "site_name": "Mil Luces Boutique"
    }'::jsonb
)
ON CONFLICT (key) DO NOTHING;
