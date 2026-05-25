-- Migration: Favorites and Account Enhancements

-- 1. Crear tabla de favoritos
CREATE TABLE IF NOT EXISTS public.user_favorites (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, product_id)
);

-- 2. Habilitar RLS para favoritos
ALTER TABLE public.user_favorites ENABLE ROW LEVEL SECURITY;

-- 3. Políticas para favoritos
DROP POLICY IF EXISTS "Users can manage their own favorites" ON public.user_favorites;
CREATE POLICY "Users can manage their own favorites" ON public.user_favorites
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 4. Asegurar que las órdenes tengan RLS adecuado para que el usuario vea SOLO las suyas
-- Nota: La tabla orders usa customer_id (que puede ser null en guest checkout) o customer_email. 
-- Vamos a añadir una política basada en el email para mayor seguridad.
DROP POLICY IF EXISTS "Users can view their own orders" ON public.orders;
CREATE POLICY "Users can view their own orders" ON public.orders
    FOR SELECT USING (customer_email = auth.jwt()->>'email');

-- 5. Otorgar permisos a los roles anon y authenticated
GRANT ALL ON public.user_favorites TO authenticated;
GRANT SELECT ON public.user_favorites TO anon;
