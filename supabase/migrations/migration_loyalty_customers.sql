-- Migration: Add Loyalty and Discount fields to Customers CRM

-- 1. Añadir columnas de lealtad a la tabla de clientes
ALTER TABLE public.customers 
ADD COLUMN IF NOT EXISTS discount_percent NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_partner BOOLEAN DEFAULT false;

-- 2. Asegurar que estas columnas son visibles para los roles autenticados (RLS ya gestionado en migraciones previas)
COMMENT ON COLUMN public.customers.discount_percent IS 'Descuento porcentual aplicable al cliente por lealtad o estatus PRO';
COMMENT ON COLUMN public.customers.is_partner IS 'Indica si el cliente es socio del programa VIP';
