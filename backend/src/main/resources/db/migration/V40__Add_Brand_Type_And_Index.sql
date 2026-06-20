-- [MIGRATION] Add brand type column to brands table and index for performance optimization
ALTER TABLE brands ADD COLUMN IF NOT EXISTS type VARCHAR(100) DEFAULT '기타';

-- Index on brand_id in products table to speed up product count calculations
CREATE INDEX IF NOT EXISTS idx_products_brand_id ON products(brand_id) WHERE is_deleted = false;
