-- V40_1: V41 성능 인덱스 추가 전 대상 테이블 및 필수 컬럼 안전 보강
CREATE TABLE IF NOT EXISTS packaging_specifications (
    id BIGSERIAL PRIMARY KEY,
    product_id BIGINT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS packaging_spec_bom_items (
    id BIGSERIAL PRIMARY KEY,
    packaging_spec_id BIGINT,
    master_material_id BIGINT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS product_ingredients (
    id BIGSERIAL PRIMARY KEY,
    product_id BIGINT,
    kor_name VARCHAR(255),
    inci_name VARCHAR(255),
    content_percent VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS claims (
    id BIGSERIAL PRIMARY KEY,
    lot_number VARCHAR(255),
    product_name VARCHAR(255),
    item_code VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE claims ADD COLUMN IF NOT EXISTS lot_number VARCHAR(255);
ALTER TABLE claims ADD COLUMN IF NOT EXISTS product_name VARCHAR(255);
ALTER TABLE claims ADD COLUMN IF NOT EXISTS item_code VARCHAR(255);

CREATE TABLE IF NOT EXISTS production_audit (
    id BIGSERIAL PRIMARY KEY,
    manufacturer_name VARCHAR(255),
    status VARCHAR(100),
    upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE production_audit ADD COLUMN IF NOT EXISTS manufacturer_name VARCHAR(255);
ALTER TABLE production_audit ADD COLUMN IF NOT EXISTS status VARCHAR(100);
ALTER TABLE production_audit ADD COLUMN IF NOT EXISTS upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
