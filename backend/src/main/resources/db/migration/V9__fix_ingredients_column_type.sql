-- V9__fix_ingredients_column_type.sql
-- ingredients 컬럼 타입 보정 (bytea로 잘못 생성된 경우 방지)
-- H2에서는 bytea 타입이 없으므로 단순 ALTER로 처리.
-- 이미 TEXT면 무해하게 다시 TEXT로 설정됨.
ALTER TABLE products ALTER COLUMN ingredients TYPE TEXT;
