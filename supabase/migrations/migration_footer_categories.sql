
-- Añadir columna para gestionar categorías en el footer
ALTER TABLE categories ADD COLUMN IF NOT EXISTS show_in_footer BOOLEAN DEFAULT false;

-- Marcar algunas categorías por defecto para que el footer no aparezca vacío tras la migración
UPDATE categories 
SET show_in_footer = true 
WHERE slug IN ('tiras', 'downlights', 'tubos', 'bombillas', 'paneles', 'proyectores');
