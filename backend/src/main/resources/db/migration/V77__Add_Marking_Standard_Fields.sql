-- V77: Add container and unit box marking standard fields to packaging_specifications table
-- ANSI SQL compatible for both H2 and PostgreSQL

ALTER TABLE packaging_specifications ADD COLUMN IF NOT EXISTS container_marking_type VARCHAR(20);
ALTER TABLE packaging_specifications ADD COLUMN IF NOT EXISTS container_marking_standard VARCHAR(255);
ALTER TABLE packaging_specifications ADD COLUMN IF NOT EXISTS unit_box_marking_type VARCHAR(20);
ALTER TABLE packaging_specifications ADD COLUMN IF NOT EXISTS unit_box_marking_standard VARCHAR(255);
