-- [MIGRATION] Add updated_at column to bug_reports table for JPA Auditing support
ALTER TABLE bug_reports ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP;
