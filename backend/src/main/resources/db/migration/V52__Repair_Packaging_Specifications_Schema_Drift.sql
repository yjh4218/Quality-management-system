-- V52: Repair packaging_specifications & announcements schema drift
-- Target: PostgreSQL / H2 compatible

-- 1. Ensure product_test_reports table exists
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

-- 2. Repair missing packaging_specifications columns (H2-compatible)
ALTER TABLE packaging_specifications ADD COLUMN IF NOT EXISTS approval_chain_json TEXT;
ALTER TABLE packaging_specifications ADD COLUMN IF NOT EXISTS barcode VARCHAR(255);
ALTER TABLE packaging_specifications ADD COLUMN IF NOT EXISTS lab_number VARCHAR(255);
ALTER TABLE packaging_specifications ADD COLUMN IF NOT EXISTS planner_name VARCHAR(255);
ALTER TABLE packaging_specifications ADD COLUMN IF NOT EXISTS designer_name VARCHAR(255);
ALTER TABLE packaging_specifications ADD COLUMN IF NOT EXISTS qc_name VARCHAR(255);
ALTER TABLE packaging_specifications ADD COLUMN IF NOT EXISTS management_type VARCHAR(255);
ALTER TABLE packaging_specifications ADD COLUMN IF NOT EXISTS barcode_manager VARCHAR(255);
ALTER TABLE packaging_specifications ADD COLUMN IF NOT EXISTS marking_method VARCHAR(255);
ALTER TABLE packaging_specifications ADD COLUMN IF NOT EXISTS marking_standard VARCHAR(255);
ALTER TABLE packaging_specifications ADD COLUMN IF NOT EXISTS outbox_layout_image VARCHAR(500);
ALTER TABLE packaging_specifications ADD COLUMN IF NOT EXISTS packaging_method_text TEXT;
ALTER TABLE packaging_specifications ADD COLUMN IF NOT EXISTS marking_location_image VARCHAR(500);
ALTER TABLE packaging_specifications ADD COLUMN IF NOT EXISTS inbox_type VARCHAR(255);
ALTER TABLE packaging_specifications ADD COLUMN IF NOT EXISTS inbox_qty INTEGER;
ALTER TABLE packaging_specifications ADD COLUMN IF NOT EXISTS inbox_size VARCHAR(255);
ALTER TABLE packaging_specifications ADD COLUMN IF NOT EXISTS inbox_tape_banding VARCHAR(255);
ALTER TABLE packaging_specifications ADD COLUMN IF NOT EXISTS inbox_interlayer_sheet VARCHAR(255);
ALTER TABLE packaging_specifications ADD COLUMN IF NOT EXISTS inbox_material VARCHAR(255);
ALTER TABLE packaging_specifications ADD COLUMN IF NOT EXISTS inbox_remarks VARCHAR(255);
ALTER TABLE packaging_specifications ADD COLUMN IF NOT EXISTS outbox_type VARCHAR(255);
ALTER TABLE packaging_specifications ADD COLUMN IF NOT EXISTS outbox_qty INTEGER;
ALTER TABLE packaging_specifications ADD COLUMN IF NOT EXISTS outbox_size VARCHAR(255);
ALTER TABLE packaging_specifications ADD COLUMN IF NOT EXISTS outbox_tape_banding VARCHAR(255);
ALTER TABLE packaging_specifications ADD COLUMN IF NOT EXISTS outbox_interlayer_sheet VARCHAR(255);
ALTER TABLE packaging_specifications ADD COLUMN IF NOT EXISTS outbox_material VARCHAR(255);
ALTER TABLE packaging_specifications ADD COLUMN IF NOT EXISTS outbox_remarks VARCHAR(255);
ALTER TABLE packaging_specifications ADD COLUMN IF NOT EXISTS pallet_type_str VARCHAR(255);
ALTER TABLE packaging_specifications ADD COLUMN IF NOT EXISTS pallet_stacking_method VARCHAR(255);
ALTER TABLE packaging_specifications ADD COLUMN IF NOT EXISTS pallet_size VARCHAR(255);
ALTER TABLE packaging_specifications ADD COLUMN IF NOT EXISTS pallet_height_limit VARCHAR(255);
ALTER TABLE packaging_specifications ADD COLUMN IF NOT EXISTS pallet_precautions TEXT;
ALTER TABLE packaging_specifications ADD COLUMN IF NOT EXISTS inbox_layout_image VARCHAR(500);
ALTER TABLE packaging_specifications ADD COLUMN IF NOT EXISTS outbox_layout_image_file VARCHAR(500);
ALTER TABLE packaging_specifications ADD COLUMN IF NOT EXISTS pallet_layout_image VARCHAR(500);
ALTER TABLE packaging_specifications ADD COLUMN IF NOT EXISTS one_outbox_weight DOUBLE PRECISION;
ALTER TABLE packaging_specifications ADD COLUMN IF NOT EXISTS one_pallet_weight DOUBLE PRECISION;
ALTER TABLE packaging_specifications ADD COLUMN IF NOT EXISTS one_pallet_height DOUBLE PRECISION;
ALTER TABLE packaging_specifications ADD COLUMN IF NOT EXISTS remarks TEXT;
ALTER TABLE packaging_specifications ADD COLUMN IF NOT EXISTS packaging_method_image VARCHAR(500);
ALTER TABLE packaging_specifications ADD COLUMN IF NOT EXISTS version INTEGER;
ALTER TABLE packaging_specifications ADD COLUMN IF NOT EXISTS revision_notes VARCHAR(255);
ALTER TABLE packaging_specifications ADD COLUMN IF NOT EXISTS last_modified_by VARCHAR(255);
ALTER TABLE packaging_specifications ADD COLUMN IF NOT EXISTS last_modified_at TIMESTAMP;

-- 3. Repair missing announcements columns (H2-compatible)
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS category_id BIGINT;
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS target_type VARCHAR(30) DEFAULT 'ALL';
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS email_sent BOOLEAN DEFAULT FALSE;
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS email_sent_at TIMESTAMP;
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS target_category VARCHAR(100);
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS target_manufacturer VARCHAR(100);
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS target_departments TEXT;
