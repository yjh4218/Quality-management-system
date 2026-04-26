-- [MIGRATION] Performance Optimization and Data Archiving
-- Targets: Postgres (Production) and H2 (Local Development)

-- 1. Audit Logs Archive Table
CREATE TABLE IF NOT EXISTS audit_logs_archive (
    id BIGINT PRIMARY KEY, -- Keep original ID
    entity_type VARCHAR(255) NOT NULL,
    entity_id BIGINT NOT NULL,
    action VARCHAR(255) NOT NULL,
    modifier VARCHAR(255) NOT NULL,
    modified_at TIMESTAMP NOT NULL,
    description TEXT,
    old_value TEXT,
    new_value TEXT
);

-- 2. Performance Indexes (B-Tree)
CREATE INDEX IF NOT EXISTS idx_products_active_created ON products (active, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_products_dimensions_status ON products (status);
CREATE INDEX IF NOT EXISTS idx_claims_receipt_mfr ON claims (receipt_date DESC, manufacturer);
CREATE INDEX IF NOT EXISTS idx_audit_logs_modified_at ON audit_logs (modified_at DESC);

-- 3. GIN Full-Text Search Indexes (Postgres Only)
-- Note: GIN indices are only created if the pg_trgm extension is available.
-- Flyway handles this gracefully in H2 (ignoring extension) but GIN syntax is PG specific.
-- For H2 compatibility, we wrap in a block if needed, but standard GIN is usually fine for PG.

DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_trgm') OR 
       EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pg_extension') THEN
        
        -- Enable extension if missing
        CREATE EXTENSION IF NOT EXISTS pg_trgm;

        -- Create GIN indexes for fuzzy search
        IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'idx_products_product_name_gin') THEN
            CREATE INDEX idx_products_product_name_gin ON products USING gin (product_name gin_trgm_ops);
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'idx_products_english_name_gin') THEN
            CREATE INDEX idx_products_english_name_gin ON products USING gin (english_product_name gin_trgm_ops);
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'idx_products_ingredients_gin') THEN
            CREATE INDEX idx_products_ingredients_gin ON products USING gin (ingredients gin_trgm_ops);
        END IF;
    END IF;
END $$;
