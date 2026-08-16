-- V87: 유통채널 단품 및 기획세트별 착인 및 현품표 표시 기준 확장 컬럼 추가
-- H2 & PostgreSQL (Supabase) Cross-Compatible Migration (ADD COLUMN IF NOT EXISTS)

-- 1. 단품 전용 착인 및 현품표 기재 기준
ALTER TABLE sales_channels ADD COLUMN IF NOT EXISTS unit_box_marking_rule TEXT;
ALTER TABLE sales_channels ADD COLUMN IF NOT EXISTS inbox_label_marking_rule TEXT;
ALTER TABLE sales_channels ADD COLUMN IF NOT EXISTS outbox_label_marking_rule TEXT;
ALTER TABLE sales_channels ADD COLUMN IF NOT EXISTS pallet_label_marking_rule TEXT;

-- 2. 기획세트 전용 착인 및 현품표 기재 기준 / 규격
ALTER TABLE sales_channels ADD COLUMN IF NOT EXISTS set_container_marking_display TEXT;
ALTER TABLE sales_channels ADD COLUMN IF NOT EXISTS set_unit_box_marking_rule TEXT;
ALTER TABLE sales_channels ADD COLUMN IF NOT EXISTS set_inbox_label_marking_rule TEXT;
ALTER TABLE sales_channels ADD COLUMN IF NOT EXISTS set_outbox_label_marking_rule TEXT;
ALTER TABLE sales_channels ADD COLUMN IF NOT EXISTS set_pallet_label_marking_rule TEXT;
ALTER TABLE sales_channels ADD COLUMN IF NOT EXISTS set_cushioning_standard VARCHAR(500);
ALTER TABLE sales_channels ADD COLUMN IF NOT EXISTS set_pallet_height_limit VARCHAR(100);
ALTER TABLE sales_channels ADD COLUMN IF NOT EXISTS set_channel_sticker_standard VARCHAR(500);
