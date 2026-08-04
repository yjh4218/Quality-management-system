-- V24: 제조사 코드 최종 보정 (snake_case 컬럼명 명시)

-- 1. manufacturer_code 컬럼에 데이터가 없는 경우 보정
-- identification_code 우선 사용, 없으면 M-{id} 사용
UPDATE manufacturers 
SET manufacturer_code = CASE 
    WHEN identification_code IS NOT NULL AND identification_code != '' THEN identification_code 
    ELSE CONCAT('M-', CAST(id AS VARCHAR)) 
END
WHERE manufacturer_code IS NULL OR manufacturer_code = '';

-- 2. 이미 존재하는 데이터 중 빈 문자열 보정
UPDATE manufacturers 
SET manufacturer_code = CONCAT('M-', CAST(id AS VARCHAR)) 
WHERE manufacturer_code = '';
