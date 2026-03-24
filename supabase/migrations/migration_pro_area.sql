-- Migración para el Área Profesional Administrable

-- 1. Tabla para los beneficios (Grid de la landing)
CREATE TABLE IF NOT EXISTS public.pro_benefits (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    icon_name TEXT DEFAULT 'Percent', -- Nombre del icono de Lucide
    order_index INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Tabla para el contenido general de la landing (Hero, CTAs, etc.)
-- Usaremos app_settings con la clave 'pro_page_content' o una tabla dedicada.
-- Para mayor flexibilidad, creamos una tabla de pares clave-valor específicos para PRO.
CREATE TABLE IF NOT EXISTS public.pro_content (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    section TEXT NOT NULL, -- e.g., 'hero', 'cta'
    key TEXT NOT NULL UNIQUE,
    value TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Habilitar RLS
ALTER TABLE public.pro_benefits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pro_content ENABLE ROW LEVEL SECURITY;

-- 4. Políticas de acceso (Anon Full Access para desarrollo como el resto de tablas)
DROP POLICY IF EXISTS "Anon Full Access" ON public.pro_benefits;
CREATE POLICY "Anon Full Access" ON public.pro_benefits FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON public.pro_benefits TO anon, authenticated;

DROP POLICY IF EXISTS "Anon Full Access" ON public.pro_content;
CREATE POLICY "Anon Full Access" ON public.pro_content FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON public.pro_content TO anon, authenticated;

-- 5. Inscripción de datos iniciales
INSERT INTO public.pro_content (section, key, value) VALUES
('hero', 'subtitle', 'Service for Architects & Contractors'),
('hero', 'title', 'La Alianza Perfecta para Tus Proyectos'),
('hero', 'description', 'Impulsamos tu negocio con tecnología lumínica de vanguardia, precios directos de fábrica y un soporte técnico que habla tu mismo idioma.'),
('cta', 'title', 'Únete al ProClub de Mil Luces')
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.pro_benefits (title, description, icon_name, order_index) VALUES
('Tarifas Exclusivas B2B', 'Accede a descuentos directos por volumen y precios especiales para revendedores e instaladores desde la primera unidad.', 'Percent', 0),
('Facturación VIES', 'Gestión automática de impuestos para empresas con registro de operador intracomunitario.', 'Building2', 1),
('Proyectos a Medida', 'Asesoramiento técnico lumínico para estudios de arquitectura y diseño.', 'Zap', 2)
ON CONFLICT DO NOTHING;
