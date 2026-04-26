-- [MIGRATION] BOM Master Data Advanced Fields (Feature 11 Enhancement)
-- Target: Postgres / H2

-- 1. master_packaging_materials Table Field Expansion
ALTER TABLE master_packaging_materials ADD COLUMN IF NOT EXISTS bom_code VARCHAR(100);
ALTER TABLE master_packaging_materials ADD COLUMN IF NOT EXISTS type VARCHAR(100);
ALTER TABLE master_packaging_materials ADD COLUMN IF NOT EXISTS detailed_type VARCHAR(100);
ALTER TABLE master_packaging_materials ADD COLUMN IF NOT EXISTS detailed_material TEXT;
ALTER TABLE master_packaging_materials ADD COLUMN IF NOT EXISTS weight DOUBLE PRECISION DEFAULT 0;
ALTER TABLE master_packaging_materials ADD COLUMN IF NOT EXISTS thickness DOUBLE PRECISION DEFAULT 0;

-- 2. BOM Code Unique Index
CREATE UNIQUE INDEX IF NOT EXISTS idx_bom_code_unique ON master_packaging_materials(bom_code);

-- 3. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_material_type ON master_packaging_materials(type);
CREATE INDEX IF NOT EXISTS idx_material_det_type ON master_packaging_materials(detailed_type);
