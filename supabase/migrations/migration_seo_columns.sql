-- ============================================================
-- MIGRACIÓN: Añadir columnas SEO a las tablas principales
-- Ejecutar en: Supabase Dashboard > SQL Editor
-- ============================================================

-- ── Productos ──────────────────────────────────────────────
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS meta_title       TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS meta_description TEXT DEFAULT NULL;

-- ── Categorías ─────────────────────────────────────────────
ALTER TABLE categories
  ADD COLUMN IF NOT EXISTS meta_title       TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS meta_description TEXT DEFAULT NULL;

-- ── Estancias (rooms) ──────────────────────────────────────
ALTER TABLE rooms
  ADD COLUMN IF NOT EXISTS meta_title       TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS meta_description TEXT DEFAULT NULL;

-- ── Blog Posts ─────────────────────────────────────────────
ALTER TABLE blog_posts
  ADD COLUMN IF NOT EXISTS meta_title       TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS meta_description TEXT DEFAULT NULL;

-- ── Confirmación ───────────────────────────────────────────
SELECT 'Migración SEO completada correctamente' AS resultado;
