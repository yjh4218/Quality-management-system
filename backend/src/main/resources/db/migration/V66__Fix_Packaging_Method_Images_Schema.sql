-- V66: Standard H2/Postgres alter for packaging_method_images
ALTER TABLE packaging_method_images ADD COLUMN IF NOT EXISTS created_by VARCHAR(100);
ALTER TABLE packaging_method_images ADD COLUMN IF NOT EXISTS image_path VARCHAR(500);

ALTER TABLE packaging_method_images ALTER COLUMN created_by DROP NOT NULL;
ALTER TABLE packaging_method_images ALTER COLUMN image_path DROP NOT NULL;
