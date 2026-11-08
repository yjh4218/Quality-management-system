-- V151: 포장사양서 3D 및 도면 현품표 부착 여부 컬럼 추가
ALTER TABLE packaging_specifications 
ADD COLUMN IF NOT EXISTS apply_shipping_label BOOLEAN DEFAULT TRUE;

UPDATE packaging_specifications 
SET apply_shipping_label = TRUE 
WHERE apply_shipping_label IS NULL;

