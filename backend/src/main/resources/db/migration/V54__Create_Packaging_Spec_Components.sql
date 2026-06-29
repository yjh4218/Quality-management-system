-- V54: Create Packaging Spec Components table to resolve missing schema for PackagingSpecComponent entity
CREATE TABLE IF NOT EXISTS packaging_spec_components (
    id BIGSERIAL PRIMARY KEY,
    spec_id BIGINT NOT NULL,
    component_name VARCHAR(255),
    spec_details TEXT,
    size_dimension VARCHAR(255),
    quantity INTEGER,
    supplier VARCHAR(255),
    remarks TEXT
);

-- spec_id 조회 성능 향상을 위한 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_pkg_spec_components_spec_id ON packaging_spec_components(spec_id);
