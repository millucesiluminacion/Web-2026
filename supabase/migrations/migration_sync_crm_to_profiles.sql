-- Migration: Sync CRM data to New User Profiles

-- 1. Mejorar la función de manejo de nuevos usuarios
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
    crm_record RECORD;
BEGIN
    -- Intentar encontrar datos previos en el CRM (tabla customers)
    SELECT * INTO crm_record FROM public.customers WHERE email = new.email LIMIT 1;

    -- Insertar en perfiles con los datos del CRM si existen, o valores por defecto
    INSERT INTO public.profiles (
        id, 
        full_name, 
        email, 
        role, 
        user_type, 
        company_name, 
        vat_id, 
        discount_percent, 
        is_partner,
        phone,
        address,
        needs_welcome_msg -- Marcamos si viene del CRM
    )
    VALUES (
        new.id, 
        COALESCE(crm_record.full_name, new.raw_user_meta_data->>'full_name', 'Sin Nombre'), 
        new.email, 
        'customer', 
        COALESCE(crm_record.user_type, 'persona'),
        crm_record.company_name,
        crm_record.vat_id,
        COALESCE(crm_record.discount_percent, 0),
        COALESCE(crm_record.is_partner, false),
        crm_record.phone,
        crm_record.address,
        (crm_record.id IS NOT NULL) -- Si existía en CRM, necesita bienvenida
    );

    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- El trigger ya existe (on_auth_user_created), al redefinir la función se aplica automáticamente.
