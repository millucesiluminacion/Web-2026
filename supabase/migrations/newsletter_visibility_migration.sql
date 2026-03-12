-- =====================================================
-- MIGRACIÓN: VISIBILIDAD DE PRODUCTOS Y NEWSLETTER
-- =====================================================

-- 1. Añadir columna is_active a products si no existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'is_active'
  ) THEN
    ALTER TABLE public.products ADD COLUMN is_active boolean DEFAULT true;
  END IF;
END $$;

-- 2. Crear tabla de suscriptores de newsletter
CREATE TABLE IF NOT EXISTS public.newsletter_subscribers (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    email text UNIQUE NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Crear tabla de campañas de newsletter
CREATE TABLE IF NOT EXISTS public.newsletters (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    subject text NOT NULL,
    content text NOT NULL,
    status text DEFAULT 'draft' CHECK (status IN ('draft', 'sent')),
    sent_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. RLS para Newsletter
ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.newsletters ENABLE ROW LEVEL SECURITY;

-- Políticas para suscriptores
DROP POLICY IF EXISTS "Public can subscribe to newsletter" ON public.newsletter_subscribers;
CREATE POLICY "Public can subscribe to newsletter" ON public.newsletter_subscribers
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can manage newsletter_subscribers" ON public.newsletter_subscribers;
CREATE POLICY "Admins can manage newsletter_subscribers" ON public.newsletter_subscribers
    FOR ALL USING (auth.role() = 'authenticated');

-- Políticas para newsletters
DROP POLICY IF EXISTS "Admins can manage newsletters" ON public.newsletters;
CREATE POLICY "Admins can manage newsletters" ON public.newsletters
    FOR ALL USING (auth.role() = 'authenticated');
