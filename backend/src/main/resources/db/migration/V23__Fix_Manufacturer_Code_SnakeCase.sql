-- V23: 제조사 코드 보정 (snake_case 컬럼명으로 정확히 UPDATE)

-- 1. identification_code가 있으면 그걸로 채움
UPDATE manufacturers SET manufacturer_code = identification_code 
WHERE (manufacturer_code IS NULL OR manufacturer_code = '') 
AND identification_code IS NOT NULL AND identification_code != '';

-- 2. 그래도 빈 값이면 M-{id} 형태로 기본값 생성
UPDATE manufacturers SET manufacturer_code = CONCAT('M-', CAST(id AS VARCHAR)) 
WHERE manufacturer_code IS NULL OR manufacturer_code = '';

-- 3. modifier_info도 snake_case로 보정
UPDATE manufacturer_audits SET modifier_info = 'System' 
WHERE modifier_info IS NULL OR modifier_info = '';
