-- Migration: Expand Profiles for Customers and Sync Trigger Fix

-- 1. Añadir columnas de cliente a la tabla de perfiles (Profiles)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS user_type TEXT DEFAULT 'persona',
ADD COLUMN IF NOT EXISTS company_name TEXT,
ADD COLUMN IF NOT EXISTS vat_id TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS discount_percent NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_partner BOOLEAN DEFAULT false;

-- 2. Actualizar la restricción de roles para admitir 'customer'
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check 
    CHECK (role IN ('admin', 'manager', 'editor', 'customer'));

-- 3. Actualizar la función handle_new_user para que sea robusta
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
    crm_record RECORD;
BEGIN
    -- Intentar encontrar datos previos en el CRM (tabla customers)
    SELECT * INTO crm_record FROM public.customers WHERE email = new.email LIMIT 1;

    -- Insertar en perfiles sincronizando los campos del CRM si existen
    INSERT INTO public.profiles (
        id, 
        full_name, 
        email, 
        role, 
        user_type, 
        company_name, 
        vat_id, 
        phone,
        address,
        discount_percent, 
        is_partner
    )
    VALUES (
        new.id, 
        COALESCE(new.raw_user_meta_data->>'full_name', crm_record.full_name, 'Sin Nombre'), 
        new.email, 
        COALESCE(new.raw_user_meta_data->>'role', 'customer'),
        COALESCE(crm_record.user_type, 'persona'),
        crm_record.company_name,
        crm_record.vat_id,
        crm_record.phone,
        crm_record.address,
        COALESCE(crm_record.discount_percent, 0),
        COALESCE(crm_record.is_partner, false)
    );

    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
