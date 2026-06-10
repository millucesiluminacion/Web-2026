-- Migration: Add focus_keywords column to SEO-relevant tables
-- Run this in Supabase SQL Editor

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS focus_keywords TEXT DEFAULT '';

ALTER TABLE categories
  ADD COLUMN IF NOT EXISTS focus_keywords TEXT DEFAULT '';

ALTER TABLE rooms
  ADD COLUMN IF NOT EXISTS focus_keywords TEXT DEFAULT '';
