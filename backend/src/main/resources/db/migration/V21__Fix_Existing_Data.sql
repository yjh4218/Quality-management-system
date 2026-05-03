-- V21: 기존 데이터 보정 (제조사 코드 및 작성자 정보)

-- 1. 제조사 코드가 누락된 경우 식별코드로 채우거나 기본값 생성
UPDATE manufacturers SET manufacturer_code = identification_code WHERE manufacturer_code IS NULL AND identification_code IS NOT NULL;
UPDATE manufacturers SET manufacturer_code = 'M-' || id WHERE manufacturer_code IS NULL;

-- 2. Audit 내역 중 작성자가 누락된 경우 'System'으로 설정
UPDATE manufacturer_audits SET modifier_info = 'System' WHERE modifier_info IS NULL OR modifier_info = '';

-- 3. Audit 내역 중 등급이 누락된 경우 'C'로 기본 설정 (필요시)
UPDATE manufacturer_audits SET grade = 'C' WHERE grade IS NULL OR grade = '';
