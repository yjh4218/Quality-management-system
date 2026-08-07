-- V76: Repair bug_reports schema drift safely (ANSI SQL)
ALTER TABLE bug_reports ADD COLUMN IF NOT EXISTS occurrence_count INTEGER DEFAULT 1;
ALTER TABLE bug_reports ADD COLUMN IF NOT EXISTS error_category VARCHAR(30) DEFAULT 'UNKNOWN';
ALTER TABLE bug_reports ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP;

