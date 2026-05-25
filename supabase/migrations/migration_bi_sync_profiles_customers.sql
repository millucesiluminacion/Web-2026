-- Migration: Bi-directional Sync between Profiles and Customers
-- This ensures that Admin (Customers table) and User Profile (Profiles table) stay in sync

-- 1. Function: Sync Profile changes to Customers table (UPSERT)
-- ONLY sync if the role is 'customer' (exclude staff/admins from CRM)
CREATE OR REPLACE FUNCTION public.sync_profile_to_customer()
RETURNS trigger AS $$
BEGIN
    -- Solo sincronizamos si el rol es 'customer'
    IF (new.role = 'customer') THEN
        INSERT INTO public.customers (
            full_name, email, phone, address, user_type, company_name, vat_id, discount_percent, is_partner
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
            new.is_partner
        )
        ON CONFLICT (email) DO UPDATE SET
            full_name = EXCLUDED.full_name,
            phone = EXCLUDED.phone,
            address = EXCLUDED.address,
            user_type = EXCLUDED.user_type,
            company_name = EXCLUDED.company_name,
            vat_id = EXCLUDED.vat_id,
            discount_percent = EXCLUDED.discount_percent,
            is_partner = EXCLUDED.is_partner;
    END IF;
    
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Function: Sync Customer changes to Profiles table (UPDATE ONLY - Profiles exist via Auth)
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
        is_partner = new.is_partner
    WHERE email = new.email;
    
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Triggers
DROP TRIGGER IF EXISTS tr_sync_profile_to_customer ON public.profiles;
CREATE TRIGGER tr_sync_profile_to_customer
    AFTER INSERT OR UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.sync_profile_to_customer();

DROP TRIGGER IF EXISTS tr_sync_customer_to_profile ON public.customers;
CREATE TRIGGER tr_sync_customer_to_profile
    AFTER UPDATE ON public.customers
    FOR EACH ROW EXECUTE FUNCTION public.sync_customer_to_profile();

-- 4. Re-sync everything right now to fix current inconsistencies
UPDATE public.profiles p
SET 
    full_name = COALESCE(NULLIF(p.full_name, 'Sin Nombre'), c.full_name, p.full_name),
    phone = COALESCE(p.phone, c.phone),
    address = COALESCE(p.address, c.address),
    user_type = COALESCE(p.user_type, c.user_type, 'persona'),
    company_name = COALESCE(p.company_name, c.company_name),
    vat_id = COALESCE(p.vat_id, c.vat_id),
    discount_percent = COALESCE(NULLIF(p.discount_percent, 0), c.discount_percent, p.discount_percent),
    is_partner = COALESCE(p.is_partner, c.is_partner, false)
FROM public.customers c
WHERE p.email = c.email;

UPDATE public.customers c
SET 
    full_name = COALESCE(NULLIF(c.full_name, 'Sin Nombre'), p.full_name, c.full_name),
    phone = COALESCE(c.phone, p.phone),
    address = COALESCE(c.address, p.address),
    user_type = COALESCE(c.user_type, p.user_type, 'persona'),
    company_name = COALESCE(c.company_name, p.company_name),
    vat_id = COALESCE(c.vat_id, p.vat_id),
    discount_percent = COALESCE(NULLIF(c.discount_percent, 0), p.discount_percent, c.discount_percent),
    is_partner = COALESCE(c.is_partner, p.is_partner, false)
FROM public.profiles p
WHERE c.email = p.email;
