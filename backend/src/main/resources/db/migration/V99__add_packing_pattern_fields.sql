-- V99: Add 3D Packing and Pallet Stacking Pattern Description Columns to packaging_specifications
-- Cross-compatible with H2 & PostgreSQL (ANSI SQL standard)

ALTER TABLE packaging_specifications ADD COLUMN IF NOT EXISTS inbox_packing_pattern VARCHAR(100);
ALTER TABLE packaging_specifications ADD COLUMN IF NOT EXISTS outbox_packing_pattern VARCHAR(100);
ALTER TABLE packaging_specifications ADD COLUMN IF NOT EXISTS pallet_stacking_pattern VARCHAR(100);
