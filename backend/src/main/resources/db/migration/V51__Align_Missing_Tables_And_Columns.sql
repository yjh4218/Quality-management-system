-- V51: Align missing product_test_reports table and packaging_specifications columns
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

-- 2. Add missing columns to packaging_specifications if not exists (Safe conditional execution)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='packaging_specifications' AND column_name='approval_chain_json') THEN
        ALTER TABLE packaging_specifications ADD COLUMN approval_chain_json TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='packaging_specifications' AND column_name='barcode') THEN
        ALTER TABLE packaging_specifications ADD COLUMN barcode VARCHAR(255);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='packaging_specifications' AND column_name='lab_number') THEN
        ALTER TABLE packaging_specifications ADD COLUMN lab_number VARCHAR(255);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='packaging_specifications' AND column_name='planner_name') THEN
        ALTER TABLE packaging_specifications ADD COLUMN planner_name VARCHAR(255);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='packaging_specifications' AND column_name='designer_name') THEN
        ALTER TABLE packaging_specifications ADD COLUMN designer_name VARCHAR(255);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='packaging_specifications' AND column_name='qc_name') THEN
        ALTER TABLE packaging_specifications ADD COLUMN qc_name VARCHAR(255);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='packaging_specifications' AND column_name='management_type') THEN
        ALTER TABLE packaging_specifications ADD COLUMN management_type VARCHAR(255);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='packaging_specifications' AND column_name='barcode_manager') THEN
        ALTER TABLE packaging_specifications ADD COLUMN barcode_manager VARCHAR(255);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='packaging_specifications' AND column_name='marking_method') THEN
        ALTER TABLE packaging_specifications ADD COLUMN marking_method VARCHAR(255);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='packaging_specifications' AND column_name='marking_standard') THEN
        ALTER TABLE packaging_specifications ADD COLUMN marking_standard VARCHAR(255);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='packaging_specifications' AND column_name='outbox_layout_image') THEN
        ALTER TABLE packaging_specifications ADD COLUMN outbox_layout_image VARCHAR(500);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='packaging_specifications' AND column_name='packaging_method_text') THEN
        ALTER TABLE packaging_specifications ADD COLUMN packaging_method_text TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='packaging_specifications' AND column_name='marking_location_image') THEN
        ALTER TABLE packaging_specifications ADD COLUMN marking_location_image VARCHAR(500);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='packaging_specifications' AND column_name='inbox_type') THEN
        ALTER TABLE packaging_specifications ADD COLUMN inbox_type VARCHAR(255);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='packaging_specifications' AND column_name='inbox_qty') THEN
        ALTER TABLE packaging_specifications ADD COLUMN inbox_qty INTEGER;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='packaging_specifications' AND column_name='inbox_size') THEN
        ALTER TABLE packaging_specifications ADD COLUMN inbox_size VARCHAR(255);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='packaging_specifications' AND column_name='inbox_tape_banding') THEN
        ALTER TABLE packaging_specifications ADD COLUMN inbox_tape_banding VARCHAR(255);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='packaging_specifications' AND column_name='inbox_interlayer_sheet') THEN
        ALTER TABLE packaging_specifications ADD COLUMN inbox_interlayer_sheet VARCHAR(255);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='packaging_specifications' AND column_name='inbox_material') THEN
        ALTER TABLE packaging_specifications ADD COLUMN inbox_material VARCHAR(255);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='packaging_specifications' AND column_name='inbox_remarks') THEN
        ALTER TABLE packaging_specifications ADD COLUMN inbox_remarks VARCHAR(255);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='packaging_specifications' AND column_name='outbox_type') THEN
        ALTER TABLE packaging_specifications ADD COLUMN outbox_type VARCHAR(255);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='packaging_specifications' AND column_name='outbox_qty') THEN
        ALTER TABLE packaging_specifications ADD COLUMN outbox_qty INTEGER;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='packaging_specifications' AND column_name='outbox_size') THEN
        ALTER TABLE packaging_specifications ADD COLUMN outbox_size VARCHAR(255);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='packaging_specifications' AND column_name='outbox_tape_banding') THEN
        ALTER TABLE packaging_specifications ADD COLUMN outbox_tape_banding VARCHAR(255);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='packaging_specifications' AND column_name='outbox_interlayer_sheet') THEN
        ALTER TABLE packaging_specifications ADD COLUMN outbox_interlayer_sheet VARCHAR(255);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='packaging_specifications' AND column_name='outbox_material') THEN
        ALTER TABLE packaging_specifications ADD COLUMN outbox_material VARCHAR(255);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='packaging_specifications' AND column_name='outbox_remarks') THEN
        ALTER TABLE packaging_specifications ADD COLUMN outbox_remarks VARCHAR(255);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='packaging_specifications' AND column_name='pallet_type_str') THEN
        ALTER TABLE packaging_specifications ADD COLUMN pallet_type_str VARCHAR(255);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='packaging_specifications' AND column_name='pallet_stacking_method') THEN
        ALTER TABLE packaging_specifications ADD COLUMN pallet_stacking_method VARCHAR(255);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='packaging_specifications' AND column_name='pallet_size') THEN
        ALTER TABLE packaging_specifications ADD COLUMN pallet_size VARCHAR(255);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='packaging_specifications' AND column_name='pallet_height_limit') THEN
        ALTER TABLE packaging_specifications ADD COLUMN pallet_height_limit VARCHAR(255);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='packaging_specifications' AND column_name='pallet_precautions') THEN
        ALTER TABLE packaging_specifications ADD COLUMN pallet_precautions TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='packaging_specifications' AND column_name='inbox_layout_image') THEN
        ALTER TABLE packaging_specifications ADD COLUMN inbox_layout_image VARCHAR(500);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='packaging_specifications' AND column_name='outbox_layout_image_file') THEN
        ALTER TABLE packaging_specifications ADD COLUMN outbox_layout_image_file VARCHAR(500);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='packaging_specifications' AND column_name='pallet_layout_image') THEN
        ALTER TABLE packaging_specifications ADD COLUMN pallet_layout_image VARCHAR(500);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='packaging_specifications' AND column_name='one_outbox_weight') THEN
        ALTER TABLE packaging_specifications ADD COLUMN one_outbox_weight DOUBLE PRECISION;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='packaging_specifications' AND column_name='one_pallet_weight') THEN
        ALTER TABLE packaging_specifications ADD COLUMN one_pallet_weight DOUBLE PRECISION;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='packaging_specifications' AND column_name='one_pallet_height') THEN
        ALTER TABLE packaging_specifications ADD COLUMN one_pallet_height DOUBLE PRECISION;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='packaging_specifications' AND column_name='remarks') THEN
        ALTER TABLE packaging_specifications ADD COLUMN remarks TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='packaging_specifications' AND column_name='packaging_method_image') THEN
        ALTER TABLE packaging_specifications ADD COLUMN packaging_method_image VARCHAR(500);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='packaging_specifications' AND column_name='version') THEN
        ALTER TABLE packaging_specifications ADD COLUMN version INTEGER;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='packaging_specifications' AND column_name='revision_notes') THEN
        ALTER TABLE packaging_specifications ADD COLUMN revision_notes VARCHAR(255);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='packaging_specifications' AND column_name='last_modified_by') THEN
        ALTER TABLE packaging_specifications ADD COLUMN last_modified_by VARCHAR(255);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='packaging_specifications' AND column_name='last_modified_at') THEN
        ALTER TABLE packaging_specifications ADD COLUMN last_modified_at TIMESTAMP;
    END IF;
END $$;
