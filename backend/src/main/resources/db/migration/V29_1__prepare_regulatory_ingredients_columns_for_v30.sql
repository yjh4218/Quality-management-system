-- V29_1: V30 인덱스 및 세부 설정 추가 전 regulatory_ingredients 테이블 필요 컬럼 안전 보강
ALTER TABLE regulatory_ingredients ADD COLUMN IF NOT EXISTS inci_name VARCHAR(255);
ALTER TABLE regulatory_ingredients ADD COLUMN IF NOT EXISTS korean_name VARCHAR(255);
ALTER TABLE regulatory_ingredients ADD COLUMN IF NOT EXISTS cas_number VARCHAR(255);
ALTER TABLE regulatory_ingredients ADD COLUMN IF NOT EXISTS synonym TEXT;
ALTER TABLE regulatory_ingredients ADD COLUMN IF NOT EXISTS remarks TEXT;
ALTER TABLE regulatory_ingredients ADD COLUMN IF NOT EXISTS origin VARCHAR(255);
ALTER TABLE regulatory_ingredients ADD COLUMN IF NOT EXISTS kr_status VARCHAR(100);
ALTER TABLE regulatory_ingredients ADD COLUMN IF NOT EXISTS kr_limit DOUBLE PRECISION;
ALTER TABLE regulatory_ingredients ADD COLUMN IF NOT EXISTS eu_status VARCHAR(100);
ALTER TABLE regulatory_ingredients ADD COLUMN IF NOT EXISTS eu_limit DOUBLE PRECISION;
ALTER TABLE regulatory_ingredients ADD COLUMN IF NOT EXISTS us_status VARCHAR(100);
ALTER TABLE regulatory_ingredients ADD COLUMN IF NOT EXISTS us_limit DOUBLE PRECISION;
ALTER TABLE regulatory_ingredients ADD COLUMN IF NOT EXISTS cn_status VARCHAR(100);
ALTER TABLE regulatory_ingredients ADD COLUMN IF NOT EXISTS cn_limit DOUBLE PRECISION;
ALTER TABLE regulatory_ingredients ADD COLUMN IF NOT EXISTS jp_status VARCHAR(100);
ALTER TABLE regulatory_ingredients ADD COLUMN IF NOT EXISTS jp_limit DOUBLE PRECISION;
ALTER TABLE regulatory_ingredients ADD COLUMN IF NOT EXISTS source_api VARCHAR(255);
ALTER TABLE regulatory_ingredients ADD COLUMN IF NOT EXISTS last_updated TIMESTAMP;
