-- Migration: Expand Customers table for better CRM and import support

-- 1. Añadir columnas de perfil si no existen
ALTER TABLE public.customers 
ADD COLUMN IF NOT EXISTS user_type TEXT DEFAULT 'persona' CHECK (user_type IN ('persona', 'profesional')),
ADD COLUMN IF NOT EXISTS company_name TEXT,
ADD COLUMN IF NOT EXISTS vat_id TEXT,
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- 2. Asegurar que el email sigue siendo único (ya lo es en schema.sql, pero por precaución)
-- ALTER TABLE public.customers ADD CONSTRAINT customers_email_key UNIQUE (email);

-- 3. Habilitar RLS y políticas (si no existen o para asegurar acceso)
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage customers" ON public.customers;
CREATE POLICY "Admins can manage customers" ON public.customers
    FOR ALL USING (auth.role() = 'authenticated');

-- 4. Índices para búsqueda rápida
CREATE INDEX IF NOT EXISTS idx_customers_full_name ON public.customers (full_name);
CREATE INDEX IF NOT EXISTS idx_customers_email ON public.customers (email);
CREATE INDEX IF NOT EXISTS idx_customers_company_name ON public.customers (company_name);
