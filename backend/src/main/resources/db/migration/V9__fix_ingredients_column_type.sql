-- V9__fix_ingredients_column_type.sql
-- ingredients 컬럼 타입 보정 (bytea로 잘못 생성된 경우 방지)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'products'
        AND column_name = 'ingredients'
        AND data_type = 'bytea'
    ) THEN
        ALTER TABLE products ALTER COLUMN ingredients TYPE text USING ingredients::text;
    END IF;
END $$;
