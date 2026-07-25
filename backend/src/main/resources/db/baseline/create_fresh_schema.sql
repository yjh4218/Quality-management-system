-- QMS Clean Fresh Baseline Schema (create_fresh_schema.sql)
-- 신규 로컬/운영 개발 환경을 위한 단일 통합 DDL 스크립트
-- Flyway baseline (V65) 연동 지원

-- 1. Brands Table
CREATE TABLE IF NOT EXISTS brands (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    type VARCHAR(100),
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Manufacturers Table
CREATE TABLE IF NOT EXISTS manufacturers (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    code VARCHAR(100),
    active BOOLEAN DEFAULT TRUE,
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Users Table
CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(100),
    company_name VARCHAR(255),
    manufacturer_id BIGINT REFERENCES manufacturers(id),
    department VARCHAR(100),
    position VARCHAR(100),
    email VARCHAR(255),
    phone VARCHAR(50),
    role VARCHAR(50),
    enabled BOOLEAN NOT NULL DEFAULT FALSE,
    failed_attempts INT DEFAULT 0,
    locked BOOLEAN DEFAULT FALSE,
    password_reset_required BOOLEAN DEFAULT FALSE,
    email_verified BOOLEAN DEFAULT FALSE,
    verification_token VARCHAR(255),
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_mfr_id ON users(manufacturer_id);

-- 4. Products Table
CREATE TABLE IF NOT EXISTS products (
    id BIGSERIAL PRIMARY KEY,
    item_code VARCHAR(50) NOT NULL UNIQUE,
    product_name VARCHAR(255) NOT NULL,
    english_product_name VARCHAR(255),
    product_type VARCHAR(100),
    brand_id BIGINT REFERENCES brands(id),
    manufacturer_id BIGINT REFERENCES manufacturers(id),
    manufacturer VARCHAR(255),
    shelf_life_months INT,
    opened_shelf_life_months INT,
    capacity VARCHAR(100),
    capacity_fl_oz DOUBLE PRECISION,
    weight VARCHAR(100),
    weight_oz DOUBLE PRECISION,
    status VARCHAR(50),
    recycle_grade VARCHAR(100),
    recycle_eval_no VARCHAR(100),
    recycle_material VARCHAR(100),
    image_path VARCHAR(500),
    cert_standard VARCHAR(500),
    cert_msds VARCHAR(500),
    cert_function VARCHAR(500),
    cert_expiry VARCHAR(500),
    ingredients TEXT,
    parent_item_code VARCHAR(50),
    is_parent BOOLEAN DEFAULT FALSE,
    is_master BOOLEAN DEFAULT FALSE,
    is_planning_set BOOLEAN DEFAULT FALSE,
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP,
    version BIGINT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_products_item_code ON products(item_code);
CREATE INDEX IF NOT EXISTS idx_products_mfr_id ON products(manufacturer_id);

-- 5. Claims Table
CREATE TABLE IF NOT EXISTS claims (
    id BIGSERIAL PRIMARY KEY,
    claim_number VARCHAR(100) UNIQUE,
    receipt_date DATE NOT NULL,
    country VARCHAR(100) NOT NULL,
    item_code VARCHAR(50) NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    lot_number VARCHAR(100) NOT NULL,
    manufacturer VARCHAR(255) NOT NULL,
    occurrence_qty INT,
    primary_category VARCHAR(100),
    secondary_category VARCHAR(100),
    tertiary_category VARCHAR(100),
    claim_content TEXT,
    quality_check_needed VARCHAR(20) DEFAULT '필요',
    consumer_reply_needed VARCHAR(20),
    product_retrieval_needed VARCHAR(20),
    expected_retrieval_date DATE,
    recall_date DATE,
    quality_status VARCHAR(100) DEFAULT '0단계 (접수 대기)',
    shared_with_manufacturer BOOLEAN DEFAULT FALSE,
    termination_date DATE,
    root_cause_analysis TEXT,
    preventative_action TEXT,
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP,
    version BIGINT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_claims_receipt_date ON claims(receipt_date);
CREATE INDEX IF NOT EXISTS idx_claims_item_code ON claims(item_code);
CREATE INDEX IF NOT EXISTS idx_claims_lot_number ON claims(lot_number);

-- 6. WMS Inbound Table
CREATE TABLE IF NOT EXISTS wms_inbound (
    id BIGSERIAL PRIMARY KEY,
    grn_number VARCHAR(100),
    item_code VARCHAR(50) NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    quantity INT,
    manufacturer VARCHAR(255) NOT NULL,
    lot_number VARCHAR(100),
    inbound_date TIMESTAMP,
    overall_status VARCHAR(50),
    coa_file_url TEXT,
    coa_file_url_eng TEXT,
    quality_decision_date VARCHAR(50),
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP,
    last_modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_wms_inbound_date ON wms_inbound(inbound_date);
CREATE INDEX IF NOT EXISTS idx_wms_inbound_mfr_status ON wms_inbound(manufacturer, overall_status);
CREATE INDEX IF NOT EXISTS idx_wms_inbound_grn ON wms_inbound(grn_number);

-- 7. Manufacturer Invite Tokens Table
CREATE TABLE IF NOT EXISTS manufacturer_invite_tokens (
    id BIGSERIAL PRIMARY KEY,
    manufacturer_id BIGINT NOT NULL REFERENCES manufacturers(id),
    token VARCHAR(100) NOT NULL UNIQUE,
    created_by VARCHAR(100),
    expires_at TIMESTAMP NOT NULL,
    used_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_mfr_invite_token ON manufacturer_invite_tokens(token);

-- 8. Audit Logs Table
CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGSERIAL PRIMARY KEY,
    entity_type VARCHAR(100),
    entity_id BIGINT,
    action VARCHAR(50),
    modifier VARCHAR(100),
    username VARCHAR(100),
    details TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_user ON audit_logs(created_at, username);

-- 9. System Page Guides Table
CREATE TABLE IF NOT EXISTS system_page_guides (
    id BIGSERIAL PRIMARY KEY,
    page_key VARCHAR(100) NOT NULL UNIQUE,
    title VARCHAR(255),
    sections_json TEXT,
    content TEXT,
    updated_by VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_page_guides_page_key ON system_page_guides(page_key);

-- 10. Channel Packaging Rules Table
CREATE TABLE IF NOT EXISTS channel_packaging_rules (
    id BIGSERIAL PRIMARY KEY,
    channel_id BIGINT,
    rule_type VARCHAR(100),
    rule_value VARCHAR(255),
    warning_message TEXT,
    updated_by VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_channel_rules_channel_id ON channel_packaging_rules(channel_id);
CREATE INDEX IF NOT EXISTS idx_channel_rules_channel_type ON channel_packaging_rules(channel_id, rule_type);
