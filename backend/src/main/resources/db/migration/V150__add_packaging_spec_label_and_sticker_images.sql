-- V150: 포장사양서 전 포장단위 현품표 부착 이미지 및 채널 스티커 이미지 컬럼 추가
ALTER TABLE packaging_specifications 
ADD COLUMN IF NOT EXISTS channel_sticker_image_url VARCHAR(500);

ALTER TABLE packaging_specifications 
ADD COLUMN IF NOT EXISTS inbox_label_image VARCHAR(500);

ALTER TABLE packaging_specifications 
ADD COLUMN IF NOT EXISTS zipper_bag_label_image VARCHAR(500);

ALTER TABLE packaging_specifications 
ADD COLUMN IF NOT EXISTS outbox_label_image VARCHAR(500);

ALTER TABLE packaging_specifications 
ADD COLUMN IF NOT EXISTS pallet_label_image VARCHAR(500);

