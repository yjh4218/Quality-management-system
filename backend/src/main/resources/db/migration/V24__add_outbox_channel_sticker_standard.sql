-- Add outbox_channel_sticker_standard column to packaging_specifications table
ALTER TABLE packaging_specifications ADD COLUMN IF NOT EXISTS outbox_channel_sticker_standard VARCHAR(255);
