-- V101: Add discrete cols, rows, layers numeric columns for inbox and outbox packing
-- Cross-compatible with H2 & PostgreSQL (ANSI SQL standard)

ALTER TABLE packaging_specifications ADD COLUMN IF NOT EXISTS inbox_packing_cols INTEGER;
ALTER TABLE packaging_specifications ADD COLUMN IF NOT EXISTS inbox_packing_rows INTEGER;
ALTER TABLE packaging_specifications ADD COLUMN IF NOT EXISTS inbox_packing_layers INTEGER;

ALTER TABLE packaging_specifications ADD COLUMN IF NOT EXISTS outbox_packing_cols INTEGER;
ALTER TABLE packaging_specifications ADD COLUMN IF NOT EXISTS outbox_packing_rows INTEGER;
ALTER TABLE packaging_specifications ADD COLUMN IF NOT EXISTS outbox_packing_layers INTEGER;
