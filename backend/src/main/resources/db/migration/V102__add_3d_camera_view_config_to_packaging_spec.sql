-- V102: Add 3D camera view configuration columns for inbox, outbox, and pallet simulation views
ALTER TABLE packaging_specifications ADD COLUMN IF NOT EXISTS inbox_view_config VARCHAR(255);
ALTER TABLE packaging_specifications ADD COLUMN IF NOT EXISTS outbox_view_config VARCHAR(255);
ALTER TABLE packaging_specifications ADD COLUMN IF NOT EXISTS pallet_view_config VARCHAR(255);
