-- Fix: Allow subcategories with the same name under different parent categories
-- Previously, 'name' had a global UNIQUE constraint, preventing e.g.
-- "Superficie" under Downlights AND "Superficie" under Paneles.
-- We replace it with a composite unique constraint: (name, parent_id).

-- Step 1: Drop the old global unique constraint on 'name'
ALTER TABLE categories DROP CONSTRAINT IF EXISTS categories_name_key;

-- Step 2: Add new composite unique constraint
-- This allows the same name as long as the parent category is different.
-- NULL parent_id (main categories) are treated as unique per PostgreSQL standard.
ALTER TABLE categories
    ADD CONSTRAINT categories_name_parent_unique UNIQUE (name, parent_id);
