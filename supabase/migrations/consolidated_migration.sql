-- =====================================================
-- MIGRACIÓN CONSOLIDADA v2: Solo lo que falta
-- Ejecutar en Supabase SQL Editor
-- =====================================================

-- 1. Añadir columnas rating si no existen
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'rating_avg'
  ) THEN
    ALTER TABLE public.products ADD COLUMN rating_avg decimal DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'reviews_count'
  ) THEN
    ALTER TABLE public.products ADD COLUMN reviews_count integer DEFAULT 0;
  END IF;
END $$;

-- 2. Políticas RLS (drop + recreate para evitar duplicados)
DROP POLICY IF EXISTS "Badges are viewable by everyone" ON public.badges;
DROP POLICY IF EXISTS "Product badges are viewable by everyone" ON public.product_badges;
DROP POLICY IF EXISTS "Authenticated users can manage badges" ON public.badges;
DROP POLICY IF EXISTS "Authenticated users can manage product_badges" ON public.product_badges;
DROP POLICY IF EXISTS "Admins can manage badges" ON public.badges;
DROP POLICY IF EXISTS "Admins can manage product_badges" ON public.product_badges;

CREATE POLICY "Badges are viewable by everyone" ON public.badges FOR SELECT USING (true);
CREATE POLICY "Product badges are viewable by everyone" ON public.product_badges FOR SELECT USING (true);
CREATE POLICY "Authenticated users can manage badges" ON public.badges FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can manage product_badges" ON public.product_badges FOR ALL USING (auth.role() = 'authenticated');

-- 3. Trigger para ratings automáticos
CREATE OR REPLACE FUNCTION public.update_product_ratings()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    UPDATE public.products SET
      rating_avg = COALESCE((SELECT AVG(rating)::decimal FROM public.product_reviews WHERE product_id = OLD.product_id AND is_approved = true), 0),
      reviews_count = COALESCE((SELECT COUNT(*) FROM public.product_reviews WHERE product_id = OLD.product_id AND is_approved = true), 0)
    WHERE id = OLD.product_id;
    RETURN OLD;
  ELSE
    UPDATE public.products SET
      rating_avg = COALESCE((SELECT AVG(rating)::decimal FROM public.product_reviews WHERE product_id = NEW.product_id AND is_approved = true), 0),
      reviews_count = COALESCE((SELECT COUNT(*) FROM public.product_reviews WHERE product_id = NEW.product_id AND is_approved = true), 0)
    WHERE id = NEW.product_id;
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_product_ratings ON public.product_reviews;
CREATE TRIGGER trigger_update_product_ratings
AFTER INSERT OR UPDATE OR DELETE ON public.product_reviews
FOR EACH ROW EXECUTE FUNCTION public.update_product_ratings();

-- FIN
