-- V51: Align missing product_test_reports table and packaging_specifications approval_chain_json column
-- Target: Compatible with H2 and PostgreSQL

-- 1. Create product_test_reports table
CREATE TABLE IF NOT EXISTS product_test_reports (
    id BIGSERIAL PRIMARY KEY,
    product_id BIGINT NOT NULL,
    report_name VARCHAR(255),
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(255) NOT NULL,
    file_type VARCHAR(50),
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP,
    CONSTRAINT fk_test_reports_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- 2. Add approval_chain_json to packaging_specifications if not exists (Safe conditional execution)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='packaging_specifications' AND column_name='approval_chain_json') THEN
        ALTER TABLE packaging_specifications ADD COLUMN approval_chain_json TEXT;
    END IF;
END $$;
