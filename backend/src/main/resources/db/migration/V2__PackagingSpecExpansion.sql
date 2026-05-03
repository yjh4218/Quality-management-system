-- [MIGRATION] Packaging Specification Expansion & Master Data (Feature 1-11)
-- Target: Postgres / H2 (Supabase Free Tier)

-- 1. Master Data Tables
CREATE TABLE IF NOT EXISTS packaging_method_templates (
    id SERIAL PRIMARY KEY,
    product_type VARCHAR(50) UNIQUE NOT NULL,
    method_description TEXT,
    updated_by VARCHAR(100),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS channel_packaging_rules (
    id SERIAL PRIMARY KEY,
    channel VARCHAR(100),
    rule_key VARCHAR(100),
    rule_content TEXT,
    updated_by VARCHAR(100),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS master_packaging_materials (
    id SERIAL PRIMARY KEY,
    component_name VARCHAR(255) NOT NULL,
    material VARCHAR(255),
    manufacturer VARCHAR(255),
    updated_by VARCHAR(100),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS channel_sticker_images (
    id SERIAL PRIMARY KEY,
    channel VARCHAR(100),
    image_path VARCHAR(500),
    uploaded_by VARCHAR(100),
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Packaging Specification Enhancements
-- Note: packaging_specifications already exists. Adding new columns.
ALTER TABLE packaging_specifications ADD COLUMN IF NOT EXISTS inbox_spec TEXT;
ALTER TABLE packaging_specifications ADD COLUMN IF NOT EXISTS zipper_bag_spec TEXT;
ALTER TABLE packaging_specifications ADD COLUMN IF NOT EXISTS outbox_spec TEXT;
ALTER TABLE packaging_specifications ADD COLUMN IF NOT EXISTS pallet_stacking_spec TEXT;
ALTER TABLE packaging_specifications ADD COLUMN IF NOT EXISTS pallet_type VARCHAR(50);
ALTER TABLE packaging_specifications ADD COLUMN IF NOT EXISTS lot_and_expiry_format VARCHAR(500);
ALTER TABLE packaging_specifications ADD COLUMN IF NOT EXISTS signature_json TEXT;
ALTER TABLE packaging_specifications ADD COLUMN IF NOT EXISTS apply_channel_sticker BOOLEAN DEFAULT FALSE;

-- 3. BOM 상세 내역 테이블
CREATE TABLE IF NOT EXISTS packaging_spec_bom_items (
    id SERIAL PRIMARY KEY,
    packaging_spec_id BIGINT NOT NULL,
    master_material_id BIGINT NOT NULL,
    specification VARCHAR(500),
    usage_count DOUBLE PRECISION,
    sort_order INTEGER,
    CONSTRAINT fk_spec FOREIGN KEY (packaging_spec_id) REFERENCES packaging_specifications(id) ON DELETE CASCADE,
    CONSTRAINT fk_master_material FOREIGN KEY (master_material_id) REFERENCES master_packaging_materials(id)
);

-- 4. Product Entity Type Migration (Refactor)
-- Note: product_type column already exists as VARCHAR. We keep it as is, but logic will use Enum values.
-- Ensure indexes for performance
CREATE INDEX IF NOT EXISTS idx_spec_product ON packaging_specifications (product_id);
CREATE INDEX IF NOT EXISTS idx_bom_spec ON packaging_spec_bom_items (packaging_spec_id);

