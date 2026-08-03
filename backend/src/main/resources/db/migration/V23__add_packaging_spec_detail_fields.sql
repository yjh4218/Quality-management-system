-- V23__add_packaging_spec_detail_fields.sql
-- H2 & PostgreSQL (Supabase) Cross-Compatible Migration

ALTER TABLE packaging_specifications ADD COLUMN IF NOT EXISTS inbox_use_yn VARCHAR(10) DEFAULT 'Y';
ALTER TABLE packaging_specifications ADD COLUMN IF NOT EXISTS inbox_category VARCHAR(50);
ALTER TABLE packaging_specifications ADD COLUMN IF NOT EXISTS pallet_tier_qty INT;
ALTER TABLE packaging_specifications ADD COLUMN IF NOT EXISTS pallet_tier_count INT;
ALTER TABLE packaging_specifications ADD COLUMN IF NOT EXISTS pallet_total_outbox_qty INT;
ALTER TABLE packaging_specifications ADD COLUMN IF NOT EXISTS pallet_total_quantity INT;
ALTER TABLE packaging_specifications ADD COLUMN IF NOT EXISTS outbox_barcode_sticker_standard VARCHAR(255);
ALTER TABLE packaging_specifications ADD COLUMN IF NOT EXISTS outbox_cushioning_standard VARCHAR(255);
