-- V25: 제조사 코드 최종 보정 및 정렬 데이터 보강

-- 1. manufacturer_code 컬럼에 identification_code 또는 기본값 강제 할당
UPDATE manufacturers 
SET manufacturer_code = COALESCE(NULLIF(identification_code, ''), CONCAT('M-', CAST(id AS VARCHAR)))
WHERE manufacturer_code IS NULL OR manufacturer_code = '';

-- 2. manufacturer_audits 테이블의 modifier_info 보정
UPDATE manufacturer_audits SET modifier_info = '시스템 관리자' 
WHERE modifier_info IS NULL OR modifier_info = '';

-- 3. 제조사별 카테고리 시딩 보강 (템플릿 자동 매칭 테스트용)
UPDATE manufacturers SET category = '화장품' WHERE name LIKE '%콜마%' OR name LIKE '%코스맥스%';
UPDATE manufacturers SET category = '용기' WHERE name LIKE '%용기%' OR name LIKE '%연우%';
UPDATE manufacturers SET category = '공산품' WHERE category IS NULL OR category = '';
