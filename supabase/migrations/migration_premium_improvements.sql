-- Migration: Professional Validation and Welcome Messaging
-- 1. Añadir columnas de validación y flag de bienvenida
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS tax_document_url TEXT,
ADD COLUMN IF NOT EXISTS needs_welcome_msg BOOLEAN DEFAULT false;

ALTER TABLE public.customers 
ADD COLUMN IF NOT EXISTS tax_document_url TEXT;

-- 2. Actualizar el flag para los usuarios migrados (opcional, se puede hacer selectivo)
-- Marcamos como 'needs_welcome_msg' a los perfiles que existen en la tabla customers
UPDATE public.profiles p
SET needs_welcome_msg = true
FROM public.customers c
WHERE p.email = c.email;

-- 3. Actualizar funciones de sincronización para incluir el documento fiscal
CREATE OR REPLACE FUNCTION public.sync_profile_to_customer()
RETURNS trigger AS $$
BEGIN
    IF (new.role = 'customer') THEN
        INSERT INTO public.customers (
            full_name, email, phone, address, user_type, company_name, vat_id, discount_percent, is_partner, tax_document_url
        )
        VALUES (
            COALESCE(new.full_name, 'Sin Nombre'), 
            new.email, 
            new.phone, 
            new.address, 
            new.user_type, 
            new.company_name, 
            new.vat_id, 
            new.discount_percent, 
            new.is_partner,
            new.tax_document_url
        )
        ON CONFLICT (email) DO UPDATE SET
            full_name = EXCLUDED.full_name,
            phone = EXCLUDED.phone,
            address = EXCLUDED.address,
            user_type = EXCLUDED.user_type,
            company_name = EXCLUDED.company_name,
            vat_id = EXCLUDED.vat_id,
            discount_percent = EXCLUDED.discount_percent,
            is_partner = EXCLUDED.is_partner,
            tax_document_url = EXCLUDED.tax_document_url;
    END IF;
    
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.sync_customer_to_profile()
RETURNS trigger AS $$
BEGIN
    UPDATE public.profiles
    SET 
        full_name = new.full_name,
        phone = new.phone,
        address = new.address,
        user_type = new.user_type,
        company_name = new.company_name,
        vat_id = new.vat_id,
        discount_percent = new.discount_percent,
        is_partner = new.is_partner,
        tax_document_url = new.tax_document_url
    WHERE email = new.email;
    
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
