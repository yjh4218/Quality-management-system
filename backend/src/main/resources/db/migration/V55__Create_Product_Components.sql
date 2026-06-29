-- V55: Create Product Components table to resolve missing schema for ProductComponent entity
CREATE TABLE IF NOT EXISTS product_components (
    id BIGSERIAL PRIMARY KEY,
    item_code VARCHAR(255),
    product_name VARCHAR(255),
    quantity INTEGER,
    capacity VARCHAR(255),
    weight VARCHAR(255)
);

-- item_code 조회 성능 향상을 위한 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_product_components_item_code ON product_components(item_code);
