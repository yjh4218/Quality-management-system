-- V61: 국가별 포장공간비율 계산을 위한 데이터 모델 구축
ALTER TABLE products ADD COLUMN packaging_material_type VARCHAR(50); -- 'SINGLE_MATERIAL', 'COMPOSITE_MATERIAL'

CREATE TABLE packaging_components (
    id BIGSERIAL PRIMARY KEY,
    product_id BIGINT NOT NULL,
    component_name VARCHAR(255) NOT NULL,
    material_type VARCHAR(50) NOT NULL DEFAULT 'OTHER', -- 'GLASS', 'OTHER'
    
    CONSTRAINT fk_comp_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

CREATE TABLE packaging_layers (
    id BIGSERIAL PRIMARY KEY,
    component_id BIGINT NOT NULL, -- 모든 레이어는 반드시 특정 구성품에 속함
    layer_order INT NOT NULL, -- 1=1차, 2=2차, 3=3차
    layer_type VARCHAR(50) NOT NULL, -- 'CONTAINER', 'INNER_BOX', 'POUCH' 등
    
    inner_length_mm DOUBLE PRECISION NOT NULL,
    inner_width_mm DOUBLE PRECISION NOT NULL,
    inner_height_mm DOUBLE PRECISION NOT NULL,
    
    outer_length_mm DOUBLE PRECISION NOT NULL,
    outer_width_mm DOUBLE PRECISION NOT NULL,
    outer_height_mm DOUBLE PRECISION NOT NULL,
    
    uses_cushioning_material BOOLEAN DEFAULT FALSE NOT NULL,
    
    CONSTRAINT fk_layer_component FOREIGN KEY (component_id) REFERENCES packaging_components(id) ON DELETE CASCADE
);
