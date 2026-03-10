
-- 1. Tabla de Reseñas de Productos
CREATE TABLE IF NOT EXISTS public.product_reviews (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    user_name TEXT NOT NULL,
    user_email TEXT,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    is_approved BOOLEAN DEFAULT false,
    is_verified_purchase BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Añadir campos de agregados a Products
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='products' AND COLUMN_NAME='rating_avg') THEN
        ALTER TABLE public.products ADD COLUMN rating_avg DECIMAL(3,2) DEFAULT 0.00;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='products' AND COLUMN_NAME='reviews_count') THEN
        ALTER TABLE public.products ADD COLUMN reviews_count INTEGER DEFAULT 0;
    END IF;
END $$;

-- 3. Habilitar RLS
ALTER TABLE public.product_reviews ENABLE ROW LEVEL SECURITY;

-- 4. Políticas de Acceso
DROP POLICY IF EXISTS "Anon Full Access" ON public.product_reviews;
CREATE POLICY "Anon Full Access" ON public.product_reviews FOR ALL USING (true) WITH CHECK (true);

-- 5. Función y Trigger para actualización automática de ratings
CREATE OR REPLACE FUNCTION public.update_product_ratings()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
        -- Solo actualizar si la reseña está aprobada
        UPDATE public.products
        SET 
            rating_avg = (
                SELECT COALESCE(AVG(rating), 0)
                FROM public.product_reviews
                WHERE product_id = NEW.product_id AND is_approved = true
            ),
            reviews_count = (
                SELECT COUNT(*)
                FROM public.product_reviews
                WHERE product_id = NEW.product_id AND is_approved = true
            )
        WHERE id = NEW.product_id;
    ELSIF (TG_OP = 'DELETE') THEN
        UPDATE public.products
        SET 
            rating_avg = (
                SELECT COALESCE(AVG(rating), 0)
                FROM public.product_reviews
                WHERE product_id = OLD.product_id AND is_approved = true
            ),
            reviews_count = (
                SELECT COUNT(*)
                FROM public.product_reviews
                WHERE product_id = OLD.product_id AND is_approved = true
            )
        WHERE id = OLD.product_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_review_change ON public.product_reviews;
CREATE TRIGGER on_review_change
AFTER INSERT OR UPDATE OR DELETE ON public.product_reviews
FOR EACH ROW EXECUTE FUNCTION public.update_product_ratings();

-- 6. Permisos
GRANT ALL ON public.product_reviews TO anon, authenticated;
