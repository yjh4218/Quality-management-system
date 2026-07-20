-- V58: products 테이블에 포장공간비율 계산용 content_volume_ml 및 content_type 컬럼 추가 & 검증 로그 테이블 생성
ALTER TABLE products ADD COLUMN content_volume_ml DOUBLE PRECISION;
ALTER TABLE products ADD COLUMN content_type VARCHAR(50);

CREATE TABLE space_ratio_check_logs (
    id BIGSERIAL PRIMARY KEY,
    product_id BIGINT,
    item_code VARCHAR(255),
    product_name VARCHAR(255),
    checked_at TIMESTAMP NOT NULL,
    request_json TEXT,
    results_json TEXT,
    username VARCHAR(255)
);
