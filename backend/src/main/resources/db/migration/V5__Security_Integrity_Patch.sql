-- [MIGRATION] Security and Data Integrity Patch
-- Consolidates schema changes from SystemStartupRunner into official migration.
-- Targets: Postgres (Production) and H2 (Local Development)

-- 0. Ensure All Core Base Tables Exist with Standard Baseline Columns
-- (Guarantees fresh H2 CI test databases don't throw 'Table/Column not found' during early ALTER TABLE migrations)

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE,
    password VARCHAR(255),
    role VARCHAR(50)
);

CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS manufacturers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS wms_inbound (
    id SERIAL PRIMARY KEY,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS wms_inbound_history (
    id SERIAL PRIMARY KEY,
    inbound_id BIGINT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    product_name VARCHAR(255),
    ingredients TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS claims (
    id SERIAL PRIMARY KEY,
    receipt_date DATE,
    manufacturer VARCHAR(255),
    claim_content TEXT,
    root_cause_analysis TEXT,
    preventative_action TEXT,
    mfr_root_cause_analysis TEXT,
    mfr_preventative_action TEXT,
    quality_remarks TEXT,
    mfr_remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS product_history (
    id SERIAL PRIMARY KEY,
    product_id BIGINT,
    old_value TEXT,
    new_value TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS claim_history (
    id SERIAL PRIMARY KEY,
    claim_id BIGINT,
    old_value TEXT,
    new_value TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS production_audit (
    id SERIAL PRIMARY KEY,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGSERIAL PRIMARY KEY,
    entity_type VARCHAR(255),
    entity_id BIGINT,
    action VARCHAR(255),
    modifier VARCHAR(255),
    modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    description TEXT,
    old_value TEXT,
    new_value TEXT
);

CREATE TABLE IF NOT EXISTS announcements (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS bug_reports (
    id BIGSERIAL PRIMARY KEY,
    title VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS notification_settings (
    id SERIAL PRIMARY KEY,
    setting_key VARCHAR(100)
);

CREATE TABLE IF NOT EXISTS regulatory_ingredients (
    id BIGSERIAL PRIMARY KEY,
    korean_name VARCHAR(500)
);

-- 1. Roles Table Expansion
-- V4 only created basic columns. We need to add UI/UX related fields.
ALTER TABLE roles ADD COLUMN IF NOT EXISTS allowed_menus TEXT;
ALTER TABLE roles ADD COLUMN IF NOT EXISTS dashboard_layout_id BIGINT;

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
CREATE SEQUENCE IF NOT EXISTS claim_number_seq START WITH 1;
