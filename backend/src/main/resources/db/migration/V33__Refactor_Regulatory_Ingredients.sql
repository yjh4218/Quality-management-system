-- V33: 성분 데이터 전면 리팩토링 - unique 제약 제거 및 신규 필드 추가

-- 1. inci_name unique 제약 제거 및 NOT NULL 해제
ALTER TABLE regulatory_ingredients DROP CONSTRAINT IF EXISTS regulatory_ingredients_inci_name_key;
ALTER TABLE regulatory_ingredients ALTER COLUMN inci_name DROP NOT NULL;

-- 2. 신규 필드 추가 (데이터 출처, 원료 설명, 동의어)
ALTER TABLE regulatory_ingredients ADD COLUMN IF NOT EXISTS source_api VARCHAR(50);
ALTER TABLE regulatory_ingredients ADD COLUMN IF NOT EXISTS origin TEXT;
ALTER TABLE regulatory_ingredients ADD COLUMN IF NOT EXISTS synonym VARCHAR(500);

-- 3. 기존 데이터에 source_api 기본값 설정
UPDATE regulatory_ingredients SET source_api = 'LEGACY' WHERE source_api IS NULL;
