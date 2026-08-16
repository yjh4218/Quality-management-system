-- V88__add_sales_channel_label_date_formats.sql
-- Add label date format columns for inbox, outbox, and pallet to sales_channels and packaging_specifications

ALTER TABLE sales_channels ADD COLUMN IF NOT EXISTS inbox_date_format VARCHAR(255);
ALTER TABLE sales_channels ADD COLUMN IF NOT EXISTS outbox_date_format VARCHAR(255);
ALTER TABLE sales_channels ADD COLUMN IF NOT EXISTS pallet_date_format VARCHAR(255);

ALTER TABLE packaging_specifications ADD COLUMN IF NOT EXISTS inbox_date_format VARCHAR(255);
ALTER TABLE packaging_specifications ADD COLUMN IF NOT EXISTS outbox_date_format VARCHAR(255);
ALTER TABLE packaging_specifications ADD COLUMN IF NOT EXISTS pallet_date_format VARCHAR(255);
