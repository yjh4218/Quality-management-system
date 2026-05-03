-- [MIGRATION] Security and Data Integrity Patch
-- Consolidates schema changes from SystemStartupRunner into official migration.
-- Targets: Postgres (Production) and H2 (Local Development)

-- 1. Roles Table Expansion
-- V4 only created basic columns. We need to add UI/UX related fields.
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='roles' AND column_name='allowed_menus') THEN
        ALTER TABLE roles ADD COLUMN allowed_menus TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='roles' AND column_name='dashboard_layout_id') THEN
        ALTER TABLE roles ADD COLUMN dashboard_layout_id BIGINT;
    END IF;
END $$;

-- 2. Dashboard Layouts Table
CREATE TABLE IF NOT EXISTS dashboard_layouts (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    widget_config TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Page Guides Table
CREATE TABLE IF NOT EXISTS page_guides (
    id SERIAL PRIMARY KEY,
    page_key VARCHAR(100) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    sections_json TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. WMS Inbound Column Sync
ALTER TABLE wms_inbound ADD COLUMN IF NOT EXISTS grn_number VARCHAR(255);
ALTER TABLE wms_inbound ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;
ALTER TABLE wms_inbound ADD COLUMN IF NOT EXISTS coa_file_url TEXT;
ALTER TABLE wms_inbound ADD COLUMN IF NOT EXISTS coa_file_url_eng TEXT;
ALTER TABLE wms_inbound ADD COLUMN IF NOT EXISTS coa_decision_date VARCHAR(255);
ALTER TABLE wms_inbound ADD COLUMN IF NOT EXISTS test_report_numbers TEXT;
ALTER TABLE wms_inbound ADD COLUMN IF NOT EXISTS remark TEXT;
ALTER TABLE wms_inbound ADD COLUMN IF NOT EXISTS overall_status VARCHAR(255);
ALTER TABLE wms_inbound ADD COLUMN IF NOT EXISTS inbound_inspection_status VARCHAR(255) DEFAULT '검사대기';

-- 5. Products Column Sync
ALTER TABLE products ADD COLUMN IF NOT EXISTS version BIGINT DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;
ALTER TABLE products ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT TRUE;
ALTER TABLE products ADD COLUMN IF NOT EXISTS status VARCHAR(255) DEFAULT '가안';

-- 6. Claims Column Sync
ALTER TABLE claims ADD COLUMN IF NOT EXISTS claim_number VARCHAR(255);
ALTER TABLE claims ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;
ALTER TABLE claims ADD COLUMN IF NOT EXISTS shared_with_manufacturer BOOLEAN DEFAULT FALSE;
ALTER TABLE claims ADD COLUMN IF NOT EXISTS quality_status VARCHAR(255) DEFAULT '접수대기';
ALTER TABLE claims ADD COLUMN IF NOT EXISTS mfr_status VARCHAR(255) DEFAULT '접수대기';

-- 7. Production Audit Column Sync
-- Enforce soft delete column availability
ALTER TABLE production_audit ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;

-- 8. Sequences
CREATE SEQUENCE IF NOT EXISTS claim_number_seq START 1;
