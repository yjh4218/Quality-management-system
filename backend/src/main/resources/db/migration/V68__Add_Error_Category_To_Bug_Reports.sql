-- Add error_category column to bug_reports table
ALTER TABLE bug_reports ADD COLUMN IF NOT EXISTS error_category VARCHAR(30) DEFAULT 'UNKNOWN';
