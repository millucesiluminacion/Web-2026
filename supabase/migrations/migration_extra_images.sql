-- Migration: Add extra_images column to products table
-- This allows products to have multiple images (gallery)
-- The column stores an array of image URLs as JSONB

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='products' AND COLUMN_NAME='extra_images') THEN
        ALTER TABLE public.products ADD COLUMN extra_images JSONB DEFAULT '[]'::jsonb;
    END IF;
END $$;
