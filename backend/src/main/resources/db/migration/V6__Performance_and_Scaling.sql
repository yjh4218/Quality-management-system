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
-- Note: GIN indexes and pg_trgm extension are PostgreSQL-specific features.
-- These are created via SystemStartupRunner or a separate Postgres-only init script.
-- Skipped here for H2 compatibility.
