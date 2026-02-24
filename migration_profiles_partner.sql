-- Migration to add is_partner to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_partner BOOLEAN DEFAULT FALSE;

-- Update existing professionals that have a discount_percent of 10 or more as potential initial partners?
-- No, let's keep it clean and let the admin check it manually as requested.
