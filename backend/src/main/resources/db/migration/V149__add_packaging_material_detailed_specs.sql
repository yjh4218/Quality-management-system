-- V149: 포장재 세부 가공 사양 컬럼 추가 (코팅, 인쇄, 접착제, 후가공)
ALTER TABLE master_packaging_materials 
ADD COLUMN IF NOT EXISTS coating_spec VARCHAR(500);

ALTER TABLE master_packaging_materials 
ADD COLUMN IF NOT EXISTS printing_spec VARCHAR(500);

ALTER TABLE master_packaging_materials 
ADD COLUMN IF NOT EXISTS adhesive_spec VARCHAR(500);

ALTER TABLE master_packaging_materials 
ADD COLUMN IF NOT EXISTS post_processing_spec VARCHAR(500);

-- 포장사양서 구성품 테이블에도 세부 가공 컬럼 매핑 보장
ALTER TABLE packaging_spec_components
ADD COLUMN IF NOT EXISTS coating_spec VARCHAR(500);

ALTER TABLE packaging_spec_components
ADD COLUMN IF NOT EXISTS printing_spec VARCHAR(500);

ALTER TABLE packaging_spec_components
ADD COLUMN IF NOT EXISTS adhesive_spec VARCHAR(500);

ALTER TABLE packaging_spec_components
ADD COLUMN IF NOT EXISTS post_processing_spec VARCHAR(500);
