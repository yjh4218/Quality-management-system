-- V62_2: V63 인덱스 생성 전 wms_inbound 및 audit_logs 테이블 안전 선작성
CREATE TABLE IF NOT EXISTS wms_inbound (
    id BIGSERIAL PRIMARY KEY,
    grn_number VARCHAR(255),
    item_code VARCHAR(255),
    product_name VARCHAR(255),
    quantity INT,
    manufacturer VARCHAR(255),
    overall_status VARCHAR(100),
    inbound_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE wms_inbound ADD COLUMN IF NOT EXISTS manufacturer VARCHAR(255);
ALTER TABLE wms_inbound ADD COLUMN IF NOT EXISTS overall_status VARCHAR(100);
ALTER TABLE wms_inbound ADD COLUMN IF NOT EXISTS inbound_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGSERIAL PRIMARY KEY,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
