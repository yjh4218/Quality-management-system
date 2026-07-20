-- V59: 포장방법 탭 고도화 다중 이미지 및 주석 정보 저장용 테이블 설계
CREATE TABLE packaging_method_images (
    id BIGSERIAL PRIMARY KEY,
    packaging_spec_id BIGINT NOT NULL,
    image_url VARCHAR(500) NOT NULL,
    display_order DOUBLE PRECISION DEFAULT 1000.0,
    layout_width_px INT DEFAULT 400,
    layout_height_px INT DEFAULT 300,
    annotations_json TEXT,
    caption_text TEXT,
    thumbnail_url VARCHAR(500),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    CONSTRAINT fk_pm_images_spec FOREIGN KEY (packaging_spec_id) REFERENCES packaging_specifications(id) ON DELETE CASCADE
);

CREATE INDEX idx_pm_images_spec_deleted ON packaging_method_images(packaging_spec_id, deleted_at);

-- 기존 packaging_specifications 테이블의 단일 이미지 및 텍스트 데이터 이관
INSERT INTO packaging_method_images (packaging_spec_id, image_url, display_order, layout_width_px, layout_height_px, caption_text, created_at, updated_at)
SELECT id, packaging_method_image, 1000.0, 400, 300, packaging_method_text, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM packaging_specifications
WHERE packaging_method_image IS NOT NULL AND packaging_method_image <> '';
