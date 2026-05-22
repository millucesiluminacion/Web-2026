-- Fix: RLS Policies for Newsletter Subscribers to allow Admin Management

-- 1. Asegurar que RLS está habilitado
ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;

-- 2. Eliminar políticas restrictivas previas
DROP POLICY IF EXISTS "Admins can manage newsletter_subscribers" ON public.newsletter_subscribers;
DROP POLICY IF EXISTS "Public can subscribe to newsletter" ON public.newsletter_subscribers;

-- 3. Crear política para Suscripción Pública (Solo inserción)
CREATE POLICY "Public can subscribe to newsletter" ON public.newsletter_subscribers
    FOR INSERT WITH CHECK (true);

-- 4. Crear política para Gestión Administrativa (Todo para autenticados)
-- Usamos (true) en USING y WITH CHECK para simplificar y asegurar acceso si están logueados
CREATE POLICY "Admins can manage newsletter_subscribers" ON public.newsletter_subscribers
    FOR ALL 
    USING (auth.role() = 'authenticated') 
    WITH CHECK (auth.role() = 'authenticated');

-- 5. Dar permisos explícitos a los roles
GRANT ALL ON public.newsletter_subscribers TO authenticated;
GRANT INSERT ON public.newsletter_subscribers TO anon;
