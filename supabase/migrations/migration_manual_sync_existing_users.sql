-- Migration: Sync Existing Profiles with CRM Data
-- Run this once to populate profiles for users who registered BEFORE the sync trigger was created

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

-- Ensure roles are correct for everyone
UPDATE public.profiles
SET role = 'customer'
WHERE role NOT IN ('admin', 'manager', 'editor');
