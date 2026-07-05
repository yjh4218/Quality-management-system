-- V56: Repair channel_packaging_rules schema and seed 14 channel rules
-- Target: PostgreSQL / H2 compatible standard SQL execution

-- 1. Add new columns to sales_channels if they do not exist
ALTER TABLE sales_channels ADD COLUMN IF NOT EXISTS channel_code VARCHAR(50);
ALTER TABLE sales_channels ADD COLUMN IF NOT EXISTS pallet_type VARCHAR(100);
ALTER TABLE sales_channels ADD COLUMN IF NOT EXISTS pallet_spec VARCHAR(255);
ALTER TABLE sales_channels ADD COLUMN IF NOT EXISTS channel_sticker_required BOOLEAN DEFAULT FALSE;
ALTER TABLE sales_channels ADD COLUMN IF NOT EXISTS max_stack_height_mm INT DEFAULT 1500;
ALTER TABLE sales_channels ADD COLUMN IF NOT EXISTS pad_and_frame_required BOOLEAN DEFAULT FALSE;
ALTER TABLE sales_channels ADD COLUMN IF NOT EXISTS exp_date_format VARCHAR(50);
ALTER TABLE sales_channels ADD COLUMN IF NOT EXISTS special_notes TEXT;
ALTER TABLE sales_channels ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;

-- 2. Add columns to channel_packaging_rules if they do not exist
ALTER TABLE channel_packaging_rules ADD COLUMN IF NOT EXISTS channel_id BIGINT;
ALTER TABLE channel_packaging_rules ADD COLUMN IF NOT EXISTS rule_type VARCHAR(255);
ALTER TABLE channel_packaging_rules ADD COLUMN IF NOT EXISTS rule_value TEXT;
ALTER TABLE channel_packaging_rules ADD COLUMN IF NOT EXISTS warning_message TEXT;

-- 3. Seed sales_channels if they do not exist
INSERT INTO sales_channels (name, active, description, updated_by, is_deleted)
SELECT '일반(GENERAL)', true, '일반 유통채널', 'SYSTEM', false
WHERE NOT EXISTS (SELECT 1 FROM sales_channels WHERE name = '일반(GENERAL)');

INSERT INTO sales_channels (name, active, description, updated_by, is_deleted)
SELECT '올리브영(OY)', true, '올리브영 채널', 'SYSTEM', false
WHERE NOT EXISTS (SELECT 1 FROM sales_channels WHERE name = '올리브영(OY)');

INSERT INTO sales_channels (name, active, description, updated_by, is_deleted)
SELECT '군마트(PX)', true, '군마트 PX 채널', 'SYSTEM', false
WHERE NOT EXISTS (SELECT 1 FROM sales_channels WHERE name = '군마트(PX)');

INSERT INTO sales_channels (name, active, description, updated_by, is_deleted)
SELECT '일본/온라인(JP/ON)', true, '일본 온라인 채널', 'SYSTEM', false
WHERE NOT EXISTS (SELECT 1 FROM sales_channels WHERE name = '일본/온라인(JP/ON)');

INSERT INTO sales_channels (name, active, description, updated_by, is_deleted)
SELECT '일본/오프라인(JP/OFF)', true, '일본 오프라인 채널', 'SYSTEM', false
WHERE NOT EXISTS (SELECT 1 FROM sales_channels WHERE name = '일본/오프라인(JP/OFF)');

INSERT INTO sales_channels (name, active, description, updated_by, is_deleted)
SELECT '일본/아마존(JP/AMZ)', true, '일본 아마존 채널', 'SYSTEM', false
WHERE NOT EXISTS (SELECT 1 FROM sales_channels WHERE name = '일본/아마존(JP/AMZ)');

INSERT INTO sales_channels (name, active, description, updated_by, is_deleted)
SELECT '글로벌(GLB)', true, '글로벌 수출 채널', 'SYSTEM', false
WHERE NOT EXISTS (SELECT 1 FROM sales_channels WHERE name = '글로벌(GLB)');

INSERT INTO sales_channels (name, active, description, updated_by, is_deleted)
SELECT '미국/아마존(US/AMZ)', true, '미국 아마존 채널', 'SYSTEM', false
WHERE NOT EXISTS (SELECT 1 FROM sales_channels WHERE name = '미국/아마존(US/AMZ)');

INSERT INTO sales_channels (name, active, description, updated_by, is_deleted)
SELECT '유럽(EU)', true, '유럽 수출 채널', 'SYSTEM', false
WHERE NOT EXISTS (SELECT 1 FROM sales_channels WHERE name = '유럽(EU)');

INSERT INTO sales_channels (name, active, description, updated_by, is_deleted)
SELECT '올리브영/역직구(OY/US)', true, '올리브영 역직구 채널', 'SYSTEM', false
WHERE NOT EXISTS (SELECT 1 FROM sales_channels WHERE name = '올리브영/역직구(OY/US)');

INSERT INTO sales_channels (name, active, description, updated_by, is_deleted)
SELECT '유럽/아마존(EU/AMZ)', true, '유럽 아마존 채널', 'SYSTEM', false
WHERE NOT EXISTS (SELECT 1 FROM sales_channels WHERE name = '유럽/아마존(EU/AMZ)');

INSERT INTO sales_channels (name, active, description, updated_by, is_deleted)
SELECT '미국/OTC(OTC)', true, '미국 OTC 의약외품 채널', 'SYSTEM', false
WHERE NOT EXISTS (SELECT 1 FROM sales_channels WHERE name = '미국/OTC(OTC)');

INSERT INTO sales_channels (name, active, description, updated_by, is_deleted)
SELECT '할랄(HALAL)', true, '할랄 인증 채널', 'SYSTEM', false
WHERE NOT EXISTS (SELECT 1 FROM sales_channels WHERE name = '할랄(HALAL)');


-- 4. Update sales_channels metadata column rules mapping
UPDATE sales_channels SET channel_code = 'GENERAL', pallet_type = '아주팔레트', pallet_spec = '아주팔레트 (1,100 x 1,100 mm)', channel_sticker_required = false, max_stack_height_mm = 1500, pad_and_frame_required = false, exp_date_format = 'YYYYMMDD까지' WHERE name = '일반(GENERAL)';
UPDATE sales_channels SET channel_code = 'OY', pallet_type = '아주팔레트', pallet_spec = '아주팔레트 (1,100 x 1,100 mm)', channel_sticker_required = false, max_stack_height_mm = 1050, pad_and_frame_required = false, exp_date_format = 'YYYYMMDD까지', special_notes = '인박스 사용 시 B형 인박스 사용, 인박스에 박스 테이프 부착 금지\n아웃박스 포장 중 단상자 POP 등으로 빈공간 발생 시 비닐 에어캡으로 공간 완충 필요(부직포·발포지·폐지·신문지 사용 금지)\n인박스 현품표 사용 시 바코드 미기재 필수' WHERE name = '올리브영(OY)';
UPDATE sales_channels SET channel_code = 'PX', pallet_type = '아주팔레트', pallet_spec = '아주팔레트 (1,100 x 1,100 mm)', channel_sticker_required = false, max_stack_height_mm = 1050, pad_and_frame_required = false, exp_date_format = 'YYYYMMDD까지', special_notes = '용기 및 단상자에 군마트용 문구 기재 확인 필수\n아웃박스 바코드 별도 운영 - 반드시 확인 후 아웃박스 현품표에 아웃박스 바코드 기재 필요' WHERE name = '군마트(PX)';
UPDATE sales_channels SET channel_code = 'JP-ON', pallet_type = '아주팔레트', pallet_spec = '아주팔레트 (1,100 x 1,100 mm)', channel_sticker_required = false, max_stack_height_mm = 1500, pad_and_frame_required = false, exp_date_format = 'YYYYMMDD까지', special_notes = '7매 마스크 품목에 한해 제조번호만 압인하며, 사용기한 압인 금지' WHERE name = '일본/온라인(JP/ON)';
UPDATE sales_channels SET channel_code = 'JP-OFF', pallet_type = '수출용 검은색 일회용 팔레트', pallet_spec = '1,100 x 1,100 mm', channel_sticker_required = false, max_stack_height_mm = 1500, pad_and_frame_required = true, exp_date_format = '표기금지', special_notes = '전 품목 사용기한 착인 또는 압인 금지, 제조번호만 착인 또는 압인\n일문 패키지\n인박스, 아웃박스, 팔레트 현품표에 사용기한 기재 금지\n인박스(+현품표) 필수\n기획세트의 경우 모든 구성품의 로트 착인하며, 인박스·아웃박스·팔레트 현품표에도 모든 구성품의 로트 착인' WHERE name = '일본/오프라인(JP/OFF)';
UPDATE sales_channels SET channel_code = 'JP-AMZ', pallet_type = '수출용 검은색 일회용 팔레트', pallet_spec = '1,100 x 1,100 mm', channel_sticker_required = false, max_stack_height_mm = 1500, pad_and_frame_required = true, exp_date_format = 'MM-DD-YYYY', special_notes = '일문 패키지 + AMZ바코드(X바코드)\n7매 마스크 품목의 경우 지퍼백 포장 시 주의사항 문구 표시 필수: ※ご注意ください※\nこのビニール袋には、7枚入りマスクパック가 [7袋]入っています。\n出荷時は[1袋ずつ]取り出して出荷してください。 (7매와 1매입 글자 굵게 표시)' WHERE name = '일본/아마존(JP/AMZ)';
UPDATE sales_channels SET channel_code = 'GLB', pallet_type = '수출용 검은색 일회용 팔레트', pallet_spec = '1,100 x 1,100 mm', channel_sticker_required = false, max_stack_height_mm = 1500, pad_and_frame_required = true, exp_date_format = 'YYYYMMDD까지' WHERE name = '글로벌(GLB)';
UPDATE sales_channels SET channel_code = 'US-AMZ', pallet_type = '수출용 검은색 일회용 팔레트', pallet_spec = '1,100 x 1,100 mm', channel_sticker_required = true, max_stack_height_mm = 1500, pad_and_frame_required = true, exp_date_format = 'MM-DD-YYYY', special_notes = 'AMZ바코드(X바코드) 확인 필수' WHERE name = '미국/아마존(US/AMZ)';
UPDATE sales_channels SET channel_code = 'EU', pallet_type = '수출용 검은색 일회용 팔레트', pallet_spec = '1,100 x 1,100 mm', channel_sticker_required = true, max_stack_height_mm = 1500, pad_and_frame_required = true, exp_date_format = 'DDMMYYYY' WHERE name = '유럽(EU)';
UPDATE sales_channels SET channel_code = 'OY-US', pallet_type = '수출용 검은색 일회용 팔레트', pallet_spec = '1,100 x 1,100 mm', channel_sticker_required = false, max_stack_height_mm = 1500, pad_and_frame_required = true, exp_date_format = 'YYYYMMDD까지', special_notes = '인박스 사용 시 B형 인박스 사용, 인박스에 박스 테이프 부착 금지\n아웃박스 포장 중 단상자 POP 등으로 빈공간 발생 시 비닐 에어캡으로 공간 완충 필요\n인박스 현품표 사용 시 바코드 미기재 필수' WHERE name = '올리브영/역직구(OY/US)';
UPDATE sales_channels SET channel_code = 'EU-AMZ', pallet_type = '수출용 목재 팔렛트', pallet_spec = '수출용 목재 팔렛트(1219*1016*120) - 바닥보드 5개 / 훈증처리(GMA) 필수', channel_sticker_required = true, max_stack_height_mm = 1500, pad_and_frame_required = true, exp_date_format = 'DDMMYYYY', special_notes = 'AMZ바코드(X바코드) 확인 필수' WHERE name = '유럽/아마존(EU/AMZ)';
UPDATE sales_channels SET channel_code = 'OTC', pallet_type = '수출용 검은색 일회용 팔레트', pallet_spec = '1,100 x 1,100 mm', channel_sticker_required = false, max_stack_height_mm = 1500, pad_and_frame_required = true, exp_date_format = 'YYYY-MM', special_notes = '미국생산 시 수출용 목재 팔렛트 (GMA훈증 필수)로 변경 요망' WHERE name = '미국/OTC(OTC)';
UPDATE sales_channels SET channel_code = 'HALAL', pallet_type = '수출용 검은색 일회용 팔레트', pallet_spec = '1,100 x 1,100 mm', channel_sticker_required = true, max_stack_height_mm = 1500, pad_and_frame_required = true, special_notes = '신설 예정 — 규칙 미확정, 사양서 작성 시 수동 확인 필요' WHERE name = '할랄(HALAL)';


-- 5. Legacy migrations removed (not needed since column names are aligned)


-- 6. Delete old default rules to prevent conflicts before seeding standard rules
DELETE FROM channel_packaging_rules 
WHERE rule_type IN ('PALLET_SPEC', 'STICKER_REQUIRED', 'LOAD_HEIGHT', 'PAD_FRAME_REQUIRED', 'LABELING', 'SPECIAL_NOTE');


-- 7. Seed detailed Rules for all 14 channels (H2 & Postgres compatible query-based seed)

-- [GENERAL]
INSERT INTO channel_packaging_rules (channel_id, rule_type, rule_value, warning_message, updated_by)
SELECT id, 'PALLET_SPEC', '아주팔레트 (1,100 x 1,100 mm)', NULL, 'SYSTEM' FROM sales_channels WHERE name = '일반(GENERAL)';
INSERT INTO channel_packaging_rules (channel_id, rule_type, rule_value, warning_message, updated_by)
SELECT id, 'STICKER_REQUIRED', '미부착', NULL, 'SYSTEM' FROM sales_channels WHERE name = '일반(GENERAL)';
INSERT INTO channel_packaging_rules (channel_id, rule_type, rule_value, warning_message, updated_by)
SELECT id, 'LOAD_HEIGHT', '1500', NULL, 'SYSTEM' FROM sales_channels WHERE name = '일반(GENERAL)';
INSERT INTO channel_packaging_rules (channel_id, rule_type, rule_value, warning_message, updated_by)
SELECT id, 'PAD_FRAME_REQUIRED', '불필요', NULL, 'SYSTEM' FROM sales_channels WHERE name = '일반(GENERAL)';
INSERT INTO channel_packaging_rules (channel_id, rule_type, rule_value, warning_message, updated_by)
SELECT id, 'LABELING', 'YYYYMMDD까지', '표기 예: 20261231까지', 'SYSTEM' FROM sales_channels WHERE name = '일반(GENERAL)';

-- [OY]
INSERT INTO channel_packaging_rules (channel_id, rule_type, rule_value, warning_message, updated_by)
SELECT id, 'PALLET_SPEC', '아주팔레트 (1,100 x 1,100 mm)', NULL, 'SYSTEM' FROM sales_channels WHERE name = '올리브영(OY)';
INSERT INTO channel_packaging_rules (channel_id, rule_type, rule_value, warning_message, updated_by)
SELECT id, 'STICKER_REQUIRED', '미부착', NULL, 'SYSTEM' FROM sales_channels WHERE name = '올리브영(OY)';
INSERT INTO channel_packaging_rules (channel_id, rule_type, rule_value, warning_message, updated_by)
SELECT id, 'LOAD_HEIGHT', '1050', NULL, 'SYSTEM' FROM sales_channels WHERE name = '올리브영(OY)';
INSERT INTO channel_packaging_rules (channel_id, rule_type, rule_value, warning_message, updated_by)
SELECT id, 'PAD_FRAME_REQUIRED', '불필요', NULL, 'SYSTEM' FROM sales_channels WHERE name = '올리브영(OY)';
INSERT INTO channel_packaging_rules (channel_id, rule_type, rule_value, warning_message, updated_by)
SELECT id, 'LABELING', 'YYYYMMDD까지', '표기 예: 20261231까지', 'SYSTEM' FROM sales_channels WHERE name = '올리브영(OY)';
INSERT INTO channel_packaging_rules (channel_id, rule_type, rule_value, warning_message, updated_by)
SELECT id, 'SPECIAL_NOTE', '인박스 사용 시 B형 인박스 사용, 인박스에 박스 테이프 부착 금지', NULL, 'SYSTEM' FROM sales_channels WHERE name = '올리브영(OY)';
INSERT INTO channel_packaging_rules (channel_id, rule_type, rule_value, warning_message, updated_by)
SELECT id, 'SPECIAL_NOTE', '아웃박스 포장 중 단상자 POP 등으로 빈공간 발생 시 비닐 에어캡으로 공간 완충 필요(부직포·발포지·폐지·신문지 사용 금지)', NULL, 'SYSTEM' FROM sales_channels WHERE name = '올리브영(OY)';
INSERT INTO channel_packaging_rules (channel_id, rule_type, rule_value, warning_message, updated_by)
SELECT id, 'SPECIAL_NOTE', '인박스 현품표 사용 시 바코드 미기재 필수', NULL, 'SYSTEM' FROM sales_channels WHERE name = '올리브영(OY)';

-- [PX]
INSERT INTO channel_packaging_rules (channel_id, rule_type, rule_value, warning_message, updated_by)
SELECT id, 'PALLET_SPEC', '아주팔레트 (1,100 x 1,100 mm)', NULL, 'SYSTEM' FROM sales_channels WHERE name = '군마트(PX)';
INSERT INTO channel_packaging_rules (channel_id, rule_type, rule_value, warning_message, updated_by)
SELECT id, 'STICKER_REQUIRED', '미부착', NULL, 'SYSTEM' FROM sales_channels WHERE name = '군마트(PX)';
INSERT INTO channel_packaging_rules (channel_id, rule_type, rule_value, warning_message, updated_by)
SELECT id, 'LOAD_HEIGHT', '1050', NULL, 'SYSTEM' FROM sales_channels WHERE name = '군마트(PX)';
INSERT INTO channel_packaging_rules (channel_id, rule_type, rule_value, warning_message, updated_by)
SELECT id, 'PAD_FRAME_REQUIRED', '불필요', NULL, 'SYSTEM' FROM sales_channels WHERE name = '군마트(PX)';
INSERT INTO channel_packaging_rules (channel_id, rule_type, rule_value, warning_message, updated_by)
SELECT id, 'LABELING', 'YYYYMMDD까지', '표기 예: 20261231까지', 'SYSTEM' FROM sales_channels WHERE name = '군마트(PX)';
INSERT INTO channel_packaging_rules (channel_id, rule_type, rule_value, warning_message, updated_by)
SELECT id, 'SPECIAL_NOTE', '용기 및 단상자에 군마트용 문구 기재 확인 필수', NULL, 'SYSTEM' FROM sales_channels WHERE name = '군마트(PX)';
INSERT INTO channel_packaging_rules (channel_id, rule_type, rule_value, warning_message, updated_by)
SELECT id, 'SPECIAL_NOTE', '아웃박스 바코드 별도 운영 - 반드시 확인 후 아웃박스 현품표에 아웃박스 바코드 기재 필요', NULL, 'SYSTEM' FROM sales_channels WHERE name = '군마트(PX)';

-- [JP-ON]
INSERT INTO channel_packaging_rules (channel_id, rule_type, rule_value, warning_message, updated_by)
SELECT id, 'PALLET_SPEC', '아주팔레트 (1,100 x 1,100 mm)', NULL, 'SYSTEM' FROM sales_channels WHERE name = '일본/온라인(JP/ON)';
INSERT INTO channel_packaging_rules (channel_id, rule_type, rule_value, warning_message, updated_by)
SELECT id, 'STICKER_REQUIRED', '미부착', NULL, 'SYSTEM' FROM sales_channels WHERE name = '일본/온라인(JP/ON)';
INSERT INTO channel_packaging_rules (channel_id, rule_type, rule_value, warning_message, updated_by)
SELECT id, 'LOAD_HEIGHT', '1500', NULL, 'SYSTEM' FROM sales_channels WHERE name = '일본/온라인(JP/ON)';
INSERT INTO channel_packaging_rules (channel_id, rule_type, rule_value, warning_message, updated_by)
SELECT id, 'PAD_FRAME_REQUIRED', '불필요', NULL, 'SYSTEM' FROM sales_channels WHERE name = '일본/온라인(JP/ON)';
INSERT INTO channel_packaging_rules (channel_id, rule_type, rule_value, warning_message, updated_by)
SELECT id, 'LABELING', 'YYYYMMDD까지', '표기 예: 20261231까지', 'SYSTEM' FROM sales_channels WHERE name = '일본/온라인(JP/ON)';
INSERT INTO channel_packaging_rules (channel_id, rule_type, rule_value, warning_message, updated_by)
SELECT id, 'SPECIAL_NOTE', '7매 마스크 품목에 한해 제조번호만 압인하며, 사용기한 압인 금지 (⚠ 품목 예외 주의)', NULL, 'SYSTEM' FROM sales_channels WHERE name = '일본/온라인(JP/ON)';

-- [JP-OFF]
INSERT INTO channel_packaging_rules (channel_id, rule_type, rule_value, warning_message, updated_by)
SELECT id, 'PALLET_SPEC', '수출용 검은색 일회용 팔레트 (1,100 x 1,100 mm)', NULL, 'SYSTEM' FROM sales_channels WHERE name = '일본/오프라인(JP/OFF)';
INSERT INTO channel_packaging_rules (channel_id, rule_type, rule_value, warning_message, updated_by)
SELECT id, 'STICKER_REQUIRED', '미부착', NULL, 'SYSTEM' FROM sales_channels WHERE name = '일본/오프라인(JP/OFF)';
INSERT INTO channel_packaging_rules (channel_id, rule_type, rule_value, warning_message, updated_by)
SELECT id, 'LOAD_HEIGHT', '1500', NULL, 'SYSTEM' FROM sales_channels WHERE name = '일본/오프라인(JP/OFF)';
INSERT INTO channel_packaging_rules (channel_id, rule_type, rule_value, warning_message, updated_by)
SELECT id, 'PAD_FRAME_REQUIRED', '필요', NULL, 'SYSTEM' FROM sales_channels WHERE name = '일본/오프라인(JP/OFF)';
INSERT INTO channel_packaging_rules (channel_id, rule_type, rule_value, warning_message, updated_by)
SELECT id, 'LABELING', '표기금지', '사용기한 기재 절대 금지 (제조번호만 허용)', 'SYSTEM' FROM sales_channels WHERE name = '일본/오프라인(JP/OFF)';
INSERT INTO channel_packaging_rules (channel_id, rule_type, rule_value, warning_message, updated_by)
SELECT id, 'SPECIAL_NOTE', '전 품목 사용기한 착인 또는 압인 금지, 제조번호만 착인 또는 압인', NULL, 'SYSTEM' FROM sales_channels WHERE name = '일본/오프라인(JP/OFF)';
INSERT INTO channel_packaging_rules (channel_id, rule_type, rule_value, warning_message, updated_by)
SELECT id, 'SPECIAL_NOTE', '일문 패키지', NULL, 'SYSTEM' FROM sales_channels WHERE name = '일본/오프라인(JP/OFF)';
INSERT INTO channel_packaging_rules (channel_id, rule_type, rule_value, warning_message, updated_by)
SELECT id, 'SPECIAL_NOTE', '인박스, 아웃박스, 팔레트 현품표에 사용기한 기재 금지', NULL, 'SYSTEM' FROM sales_channels WHERE name = '일본/오프라인(JP/OFF)';
INSERT INTO channel_packaging_rules (channel_id, rule_type, rule_value, warning_message, updated_by)
SELECT id, 'SPECIAL_NOTE', '인박스(+현품표) 필수', NULL, 'SYSTEM' FROM sales_channels WHERE name = '일본/오프라인(JP/OFF)';
INSERT INTO channel_packaging_rules (channel_id, rule_type, rule_value, warning_message, updated_by)
SELECT id, 'SPECIAL_NOTE', '기획세트의 경우 모든 구성품의 로트 착인하며, 인박스·아웃박스·팔레트 현품표에도 모든 구성품의 로트 착인', NULL, 'SYSTEM' FROM sales_channels WHERE name = '일본/오프라인(JP/OFF)';

-- [JP-AMZ]
INSERT INTO channel_packaging_rules (channel_id, rule_type, rule_value, warning_message, updated_by)
SELECT id, 'PALLET_SPEC', '수출용 검은색 일회용 팔레트 (1,100 x 1,100 mm)', NULL, 'SYSTEM' FROM sales_channels WHERE name = '일본/아마존(JP/AMZ)';
INSERT INTO channel_packaging_rules (channel_id, rule_type, rule_value, warning_message, updated_by)
SELECT id, 'STICKER_REQUIRED', '미부착', NULL, 'SYSTEM' FROM sales_channels WHERE name = '일본/아마존(JP/AMZ)';
INSERT INTO channel_packaging_rules (channel_id, rule_type, rule_value, warning_message, updated_by)
SELECT id, 'LOAD_HEIGHT', '1500', NULL, 'SYSTEM' FROM sales_channels WHERE name = '일본/아마존(JP/AMZ)';
INSERT INTO channel_packaging_rules (channel_id, rule_type, rule_value, warning_message, updated_by)
SELECT id, 'PAD_FRAME_REQUIRED', '필요', NULL, 'SYSTEM' FROM sales_channels WHERE name = '일본/아마존(JP/AMZ)';
INSERT INTO channel_packaging_rules (channel_id, rule_type, rule_value, warning_message, updated_by)
SELECT id, 'LABELING', 'MM-DD-YYYY', '표기 예: 12-31-2026', 'SYSTEM' FROM sales_channels WHERE name = '일본/아마존(JP/AMZ)';
INSERT INTO channel_packaging_rules (channel_id, rule_type, rule_value, warning_message, updated_by)
SELECT id, 'SPECIAL_NOTE', '일문 패키지 + AMZ바코드(X바코드)', NULL, 'SYSTEM' FROM sales_channels WHERE name = '일본/아마존(JP/AMZ)';
INSERT INTO channel_packaging_rules (channel_id, rule_type, rule_value, warning_message, updated_by)
SELECT id, 'SPECIAL_NOTE', '7매 마스크 품목의 경우 지퍼백 포장 시 주의사항 문구 표시 필수: ※ご注意ください※\nこのビニール袋には、7枚入りマスクパックが [7袋]入っています。\n出荷時は[1袋ずつ]取り出して出荷してください。 (7매와 1매입 글자 굵게 표시)', NULL, 'SYSTEM' FROM sales_channels WHERE name = '일본/아마존(JP/AMZ)';

-- [GLB]
INSERT INTO channel_packaging_rules (channel_id, rule_type, rule_value, warning_message, updated_by)
SELECT id, 'PALLET_SPEC', '수출용 검은색 일회용 팔레트 (1,100 x 1,100 mm)', NULL, 'SYSTEM' FROM sales_channels WHERE name = '글로벌(GLB)';
INSERT INTO channel_packaging_rules (channel_id, rule_type, rule_value, warning_message, updated_by)
SELECT id, 'STICKER_REQUIRED', '미부착', NULL, 'SYSTEM' FROM sales_channels WHERE name = '글로벌(GLB)';
INSERT INTO channel_packaging_rules (channel_id, rule_type, rule_value, warning_message, updated_by)
SELECT id, 'LOAD_HEIGHT', '1500', NULL, 'SYSTEM' FROM sales_channels WHERE name = '글로벌(GLB)';
INSERT INTO channel_packaging_rules (channel_id, rule_type, rule_value, warning_message, updated_by)
SELECT id, 'PAD_FRAME_REQUIRED', '필요', NULL, 'SYSTEM' FROM sales_channels WHERE name = '글로벌(GLB)';
INSERT INTO channel_packaging_rules (channel_id, rule_type, rule_value, warning_message, updated_by)
SELECT id, 'LABELING', 'YYYYMMDD까지', '표기 예: 20261231까지', 'SYSTEM' FROM sales_channels WHERE name = '글로벌(GLB)';

-- [US-AMZ]
INSERT INTO channel_packaging_rules (channel_id, rule_type, rule_value, warning_message, updated_by)
SELECT id, 'PALLET_SPEC', '수출용 검은색 일회용 팔레트 (1,100 x 1,100 mm)', NULL, 'SYSTEM' FROM sales_channels WHERE name = '미국/아마존(US/AMZ)';
INSERT INTO channel_packaging_rules (channel_id, rule_type, rule_value, warning_message, updated_by)
SELECT id, 'STICKER_REQUIRED', '부착', NULL, 'SYSTEM' FROM sales_channels WHERE name = '미국/아마존(US/AMZ)';
INSERT INTO channel_packaging_rules (channel_id, rule_type, rule_value, warning_message, updated_by)
SELECT id, 'LOAD_HEIGHT', '1500', NULL, 'SYSTEM' FROM sales_channels WHERE name = '미국/아마존(US/AMZ)';
INSERT INTO channel_packaging_rules (channel_id, rule_type, rule_value, warning_message, updated_by)
SELECT id, 'PAD_FRAME_REQUIRED', '필요', NULL, 'SYSTEM' FROM sales_channels WHERE name = '미국/아마존(US/AMZ)';
INSERT INTO channel_packaging_rules (channel_id, rule_type, rule_value, warning_message, updated_by)
SELECT id, 'LABELING', 'MM-DD-YYYY', '표기 예: 12-31-2026', 'SYSTEM' FROM sales_channels WHERE name = '미국/아마존(US/AMZ)';
INSERT INTO channel_packaging_rules (channel_id, rule_type, rule_value, warning_message, updated_by)
SELECT id, 'SPECIAL_NOTE', 'AMZ바코드(X바코드) 확인 필수', NULL, 'SYSTEM' FROM sales_channels WHERE name = '미국/아마존(US/AMZ)';

-- [EU]
INSERT INTO channel_packaging_rules (channel_id, rule_type, rule_value, warning_message, updated_by)
SELECT id, 'PALLET_SPEC', '수출용 검은색 일회용 팔레트 (1,100 x 1,100 mm)', NULL, 'SYSTEM' FROM sales_channels WHERE name = '유럽(EU)';
INSERT INTO channel_packaging_rules (channel_id, rule_type, rule_value, warning_message, updated_by)
SELECT id, 'STICKER_REQUIRED', '부착', NULL, 'SYSTEM' FROM sales_channels WHERE name = '유럽(EU)';
INSERT INTO channel_packaging_rules (channel_id, rule_type, rule_value, warning_message, updated_by)
SELECT id, 'LOAD_HEIGHT', '1500', NULL, 'SYSTEM' FROM sales_channels WHERE name = '유럽(EU)';
INSERT INTO channel_packaging_rules (channel_id, rule_type, rule_value, warning_message, updated_by)
SELECT id, 'PAD_FRAME_REQUIRED', '필요', NULL, 'SYSTEM' FROM sales_channels WHERE name = '유럽(EU)';
INSERT INTO channel_packaging_rules (channel_id, rule_type, rule_value, warning_message, updated_by)
SELECT id, 'LABELING', 'DDMMYYYY', '표기 예: 31122026', 'SYSTEM' FROM sales_channels WHERE name = '유럽(EU)';

-- [OY-US]
INSERT INTO channel_packaging_rules (channel_id, rule_type, rule_value, warning_message, updated_by)
SELECT id, 'PALLET_SPEC', '수출용 검은색 일회용 팔레트 (1,100 x 1,100 mm)', NULL, 'SYSTEM' FROM sales_channels WHERE name = '올리브영/역직구(OY/US)';
INSERT INTO channel_packaging_rules (channel_id, rule_type, rule_value, warning_message, updated_by)
SELECT id, 'STICKER_REQUIRED', '미부착', NULL, 'SYSTEM' FROM sales_channels WHERE name = '올리브영/역직구(OY/US)';
INSERT INTO channel_packaging_rules (channel_id, rule_type, rule_value, warning_message, updated_by)
SELECT id, 'LOAD_HEIGHT', '1500', NULL, 'SYSTEM' FROM sales_channels WHERE name = '올리브영/역직구(OY/US)';
INSERT INTO channel_packaging_rules (channel_id, rule_type, rule_value, warning_message, updated_by)
SELECT id, 'PAD_FRAME_REQUIRED', '필요', NULL, 'SYSTEM' FROM sales_channels WHERE name = '올리브영/역직구(OY/US)';
INSERT INTO channel_packaging_rules (channel_id, rule_type, rule_value, warning_message, updated_by)
SELECT id, 'LABELING', 'YYYYMMDD까지', '표기 예: 20261231까지', 'SYSTEM' FROM sales_channels WHERE name = '올리브영/역직구(OY/US)';
INSERT INTO channel_packaging_rules (channel_id, rule_type, rule_value, warning_message, updated_by)
SELECT id, 'SPECIAL_NOTE', '인박스 사용 시 B형 인박스 사용, 인박스에 박스 테이프 부착 금지', NULL, 'SYSTEM' FROM sales_channels WHERE name = '올리브영/역직구(OY/US)';
INSERT INTO channel_packaging_rules (channel_id, rule_type, rule_value, warning_message, updated_by)
SELECT id, 'SPECIAL_NOTE', '아웃박스 포장 중 단상자 POP 등으로 빈공간 발생 시 비닐 에어캡으로 공간 완충 필요', NULL, 'SYSTEM' FROM sales_channels WHERE name = '올리브영/역직구(OY/US)';
INSERT INTO channel_packaging_rules (channel_id, rule_type, rule_value, warning_message, updated_by)
SELECT id, 'SPECIAL_NOTE', '인박스 현품표 사용 시 바코드 미기재 필수', NULL, 'SYSTEM' FROM sales_channels WHERE name = '올리브영/역직구(OY/US)';

-- [EU-AMZ]
INSERT INTO channel_packaging_rules (channel_id, rule_type, rule_value, warning_message, updated_by)
SELECT id, 'PALLET_SPEC', '수출용 목재 팔렛트(1219*1016*120) - 바닥보드 5개 / 훈증처리(GMA) 필수', NULL, 'SYSTEM' FROM sales_channels WHERE name = '유럽/아마존(EU/AMZ)';
INSERT INTO channel_packaging_rules (channel_id, rule_type, rule_value, warning_message, updated_by)
SELECT id, 'STICKER_REQUIRED', '부착', NULL, 'SYSTEM' FROM sales_channels WHERE name = '유럽/아마존(EU/AMZ)';
INSERT INTO channel_packaging_rules (channel_id, rule_type, rule_value, warning_message, updated_by)
SELECT id, 'LOAD_HEIGHT', '1500', NULL, 'SYSTEM' FROM sales_channels WHERE name = '유럽/아마존(EU/AMZ)';
INSERT INTO channel_packaging_rules (channel_id, rule_type, rule_value, warning_message, updated_by)
SELECT id, 'PAD_FRAME_REQUIRED', '필요', NULL, 'SYSTEM' FROM sales_channels WHERE name = '유럽/아마존(EU/AMZ)';
INSERT INTO channel_packaging_rules (channel_id, rule_type, rule_value, warning_message, updated_by)
SELECT id, 'LABELING', 'DDMMYYYY', '표기 예: 31122026', 'SYSTEM' FROM sales_channels WHERE name = '유럽/아마존(EU/AMZ)';
INSERT INTO channel_packaging_rules (channel_id, rule_type, rule_value, warning_message, updated_by)
SELECT id, 'SPECIAL_NOTE', 'AMZ바코드(X바코드) 확인 필수', NULL, 'SYSTEM' FROM sales_channels WHERE name = '유럽/아마존(EU/AMZ)';

-- [OTC]
INSERT INTO channel_packaging_rules (channel_id, rule_type, rule_value, warning_message, updated_by)
SELECT id, 'PALLET_SPEC', '수출용 검은색 일회용 팔레트 (1,100 x 1,100 mm)', NULL, 'SYSTEM' FROM sales_channels WHERE name = '미국/OTC(OTC)';
INSERT INTO channel_packaging_rules (channel_id, rule_type, rule_value, warning_message, updated_by)
SELECT id, 'STICKER_REQUIRED', '미부착', NULL, 'SYSTEM' FROM sales_channels WHERE name = '미국/OTC(OTC)';
INSERT INTO channel_packaging_rules (channel_id, rule_type, rule_value, warning_message, updated_by)
SELECT id, 'LOAD_HEIGHT', '1500', NULL, 'SYSTEM' FROM sales_channels WHERE name = '미국/OTC(OTC)';
INSERT INTO channel_packaging_rules (channel_id, rule_type, rule_value, warning_message, updated_by)
SELECT id, 'PAD_FRAME_REQUIRED', '필요', NULL, 'SYSTEM' FROM sales_channels WHERE name = '미국/OTC(OTC)';
INSERT INTO channel_packaging_rules (channel_id, rule_type, rule_value, warning_message, updated_by)
SELECT id, 'LABELING', 'YYYY-MM', '표기 예: 2026-12', 'SYSTEM' FROM sales_channels WHERE name = '미국/OTC(OTC)';
INSERT INTO channel_packaging_rules (channel_id, rule_type, rule_value, warning_message, updated_by)
SELECT id, 'SPECIAL_NOTE', '미국생산 시 수출용 목재 팔렛트 (GMA훈증 필수)로 변경 요망', NULL, 'SYSTEM' FROM sales_channels WHERE name = '미국/OTC(OTC)';

-- [HALAL]
INSERT INTO channel_packaging_rules (channel_id, rule_type, rule_value, warning_message, updated_by)
SELECT id, 'PALLET_SPEC', '수출용 검은색 일회용 팔레트 (1,100 x 1,100 mm)', NULL, 'SYSTEM' FROM sales_channels WHERE name = '할랄(HALAL)';
INSERT INTO channel_packaging_rules (channel_id, rule_type, rule_value, warning_message, updated_by)
SELECT id, 'STICKER_REQUIRED', '부착', NULL, 'SYSTEM' FROM sales_channels WHERE name = '할랄(HALAL)';
INSERT INTO channel_packaging_rules (channel_id, rule_type, rule_value, warning_message, updated_by)
SELECT id, 'LOAD_HEIGHT', '1500', NULL, 'SYSTEM' FROM sales_channels WHERE name = '할랄(HALAL)';
INSERT INTO channel_packaging_rules (channel_id, rule_type, rule_value, warning_message, updated_by)
SELECT id, 'PAD_FRAME_REQUIRED', '필요', NULL, 'SYSTEM' FROM sales_channels WHERE name = '할랄(HALAL)';
INSERT INTO channel_packaging_rules (channel_id, rule_type, rule_value, warning_message, updated_by)
SELECT id, 'SPECIAL_NOTE', '신설 예정 — 규칙 미확정, 사양서 작성 시 수동 확인 필요', NULL, 'SYSTEM' FROM sales_channels WHERE name = '할랄(HALAL)';
