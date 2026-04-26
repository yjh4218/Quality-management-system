-- QMS Performance Optimization Indexes
-- 1. Enable pg_trgm extension for GIN indexes
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 2. B-Tree Indexes for sorting and exact matches
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_active_created ON products (active, created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_dimensions_status ON products (status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_claims_receipt_mfr ON claims (receipt_date DESC, manufacturer);

-- 3. GIN Full-Text Search Indexes for ILIKE optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_product_name_gin ON products USING gin (product_name gin_trgm_ops);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_english_name_gin ON products USING gin (english_product_name gin_trgm_ops);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_ingredients_gin ON products USING gin (ingredients gin_trgm_ops);
