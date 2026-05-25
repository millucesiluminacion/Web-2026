-- Migration: Unify CRM (customers) and Web Profiles (profiles) fields + Bi-directional Sync
-- This ensures that the Admin CRM and User Profiles are always in sync.

-- 1. Ensure all fields exist in public.customers
ALTER TABLE public.customers 
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS tax_document_url TEXT;

-- 2. Ensure all fields exist in public.profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS tax_document_url TEXT,
ADD COLUMN IF NOT EXISTS needs_welcome_msg BOOLEAN DEFAULT false;

-- 3. Function to sync Customers -> Profiles (Admin edits CRM -> User sees it in Profile)
CREATE OR REPLACE FUNCTION public.sync_crm_to_profile()
RETURNS trigger AS $$
BEGIN
    UPDATE public.profiles
    SET 
        full_name = new.full_name,
        user_type = new.user_type,
        company_name = new.company_name,
        vat_id = new.vat_id,
        phone = new.phone,
        address = new.address,
        discount_percent = new.discount_percent,
        is_partner = new.is_partner,
        tax_document_url = new.tax_document_url
    WHERE email = new.email;
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_sync_crm_to_profile ON public.customers;
CREATE TRIGGER tr_sync_crm_to_profile
AFTER UPDATE ON public.customers
FOR EACH ROW EXECUTE FUNCTION public.sync_crm_to_profile();

-- 4. Function to sync Profiles -> Customers (User edits Profile -> Admin sees it in CRM)
CREATE OR REPLACE FUNCTION public.sync_profile_to_crm()
RETURNS trigger AS $$
BEGIN
    UPDATE public.customers
    SET 
        full_name = new.full_name,
        user_type = new.user_type,
        company_name = new.company_name,
        vat_id = new.vat_id,
        phone = new.phone,
        address = new.address,
        discount_percent = new.discount_percent,
        is_partner = new.is_partner,
        tax_document_url = new.tax_document_url
    WHERE email = new.email;
    
    -- If no record in customers, we might want to insert it? 
    -- Usually handle_new_user handles the first insert.
    -- But for insurance, if someone updates a profile that isn't in CRM:
    IF NOT FOUND THEN
        INSERT INTO public.customers (full_name, email, user_type, company_name, vat_id, phone, address, discount_percent, is_partner, tax_document_url)
        VALUES (new.full_name, new.email, new.user_type, new.company_name, new.vat_id, new.phone, new.address, new.discount_percent, new.is_partner, new.tax_document_url);
    END IF;

    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_sync_profile_to_crm ON public.profiles;
CREATE TRIGGER tr_sync_profile_to_crm
AFTER UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.sync_profile_to_crm();

-- 5. Final check on handle_new_user to ensure it uses the new fields
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
    crm_record RECORD;
BEGIN
    SELECT * INTO crm_record FROM public.customers WHERE email = new.email LIMIT 1;

    INSERT INTO public.profiles (
        id, email, full_name, role, user_type, company_name, vat_id, 
        phone, address, discount_percent, is_partner, tax_document_url, 
        needs_welcome_msg
    )
    VALUES (
        new.id, new.email,
        COALESCE(crm_record.full_name, new.raw_user_meta_data->>'full_name', 'Sin Nombre'),
        'customer',
        COALESCE(crm_record.user_type, 'persona'),
        crm_record.company_name,
        crm_record.vat_id,
        crm_record.phone,
        crm_record.address,
        COALESCE(crm_record.discount_percent, 0),
        COALESCE(crm_record.is_partner, false),
        crm_record.tax_document_url,
        (crm_record.id IS NOT NULL)
    );

    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
