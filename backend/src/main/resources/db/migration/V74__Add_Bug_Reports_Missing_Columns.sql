-- V74: Add missing occurrence_count, error_category, updated_at columns to bug_reports table
-- ANSI SQL compatible for both H2 and PostgreSQL

ALTER TABLE bug_reports ADD COLUMN IF NOT EXISTS occurrence_count INT DEFAULT 1;
ALTER TABLE bug_reports ADD COLUMN IF NOT EXISTS error_category VARCHAR(30) DEFAULT 'UNKNOWN';
ALTER TABLE bug_reports ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP;
