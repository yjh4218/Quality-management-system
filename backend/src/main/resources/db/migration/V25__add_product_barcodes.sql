-- Add product_barcode and outbox_barcode columns to products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS product_barcode VARCHAR(100);
ALTER TABLE products ADD COLUMN IF NOT EXISTS outbox_barcode VARCHAR(100);
