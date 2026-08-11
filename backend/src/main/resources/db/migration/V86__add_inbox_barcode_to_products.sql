-- Add inbox_barcode column to products table for package tracking
ALTER TABLE products ADD COLUMN IF NOT EXISTS inbox_barcode VARCHAR(100);
