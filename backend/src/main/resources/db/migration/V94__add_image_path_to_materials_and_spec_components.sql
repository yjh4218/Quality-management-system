-- V94__add_image_path_to_materials_and_spec_components.sql
-- Add image_path to master_packaging_materials and packaging_spec_components (H2 & PostgreSQL compatible)

ALTER TABLE master_packaging_materials ADD COLUMN IF NOT EXISTS image_path VARCHAR(1000);

ALTER TABLE packaging_spec_components ADD COLUMN IF NOT EXISTS image_path VARCHAR(1000);
