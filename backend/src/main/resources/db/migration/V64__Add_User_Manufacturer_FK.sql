-- V64__Add_User_Manufacturer_FK.sql
-- User 테이블에 manufacturer_id FK 추가 및 기존 company_name 기반 데이터 동기화

ALTER TABLE users ADD COLUMN IF NOT EXISTS manufacturer_id BIGINT;

-- 기존 company_name 텍스트와 manufacturers.name 일치 건 데이터 동기화
UPDATE users
SET manufacturer_id = (SELECT m.id FROM manufacturers m WHERE m.name = users.company_name LIMIT 1)
WHERE company_name IS NOT NULL AND manufacturer_id IS NULL;

-- 외래키 제약조건 추가 (PostgreSQL / H2 호환)
ALTER TABLE users ADD CONSTRAINT fk_users_manufacturer FOREIGN KEY (manufacturer_id) REFERENCES manufacturers(id);
