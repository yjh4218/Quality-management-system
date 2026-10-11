-- [V129] stored_files.file_data 대용량 바이너리(BYTEA) 타입 보장 및 호환성 강화
-- Supabase PostgreSQL 및 H2(PostgreSQL MODE) 공통 호환 ANSI DDL

ALTER TABLE stored_files ALTER COLUMN file_data TYPE BYTEA;
