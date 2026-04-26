-- [MIGRATION] Fix Audit Logs Column Types for PostgreSQL
-- Converts potential BYTEA/BLOB columns to TEXT to support LOWER() and string operations.

DO $$ 
BEGIN 
    -- 1. Table: audit_logs
    -- description column
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='audit_logs' AND column_name='description') THEN
        BEGIN
            ALTER TABLE audit_logs ALTER COLUMN description TYPE TEXT USING description::TEXT;
        EXCEPTION WHEN OTHERS THEN
            -- In case it's actually binary bytea that needs decoding
            ALTER TABLE audit_logs ALTER COLUMN description TYPE TEXT USING encode(description, 'escape');
        END;
    END IF;

    -- old_value column
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='audit_logs' AND column_name='old_value') THEN
        BEGIN
            ALTER TABLE audit_logs ALTER COLUMN old_value TYPE TEXT USING old_value::TEXT;
        EXCEPTION WHEN OTHERS THEN
            ALTER TABLE audit_logs ALTER COLUMN old_value TYPE TEXT USING encode(old_value, 'escape');
        END;
    END IF;

    -- new_value column
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='audit_logs' AND column_name='new_value') THEN
        BEGIN
            ALTER TABLE audit_logs ALTER COLUMN new_value TYPE TEXT USING new_value::TEXT;
        EXCEPTION WHEN OTHERS THEN
            ALTER TABLE audit_logs ALTER COLUMN new_value TYPE TEXT USING encode(new_value, 'escape');
        END;
    END IF;

END $$;
