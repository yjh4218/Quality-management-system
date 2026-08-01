-- V76: Repair bug_reports schema drift safely (PL/pgSQL for Postgres)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='bug_reports' AND column_name='occurrence_count'
    ) THEN
        ALTER TABLE bug_reports ADD COLUMN occurrence_count INTEGER DEFAULT 1;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='bug_reports' AND column_name='error_category'
    ) THEN
        ALTER TABLE bug_reports ADD COLUMN error_category VARCHAR(30) DEFAULT 'UNKNOWN';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='bug_reports' AND column_name='updated_at'
    ) THEN
        ALTER TABLE bug_reports ADD COLUMN updated_at TIMESTAMP;
    END IF;
END $$;
