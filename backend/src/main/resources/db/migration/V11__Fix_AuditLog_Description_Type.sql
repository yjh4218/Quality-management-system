-- [MIGRATION] Fix Audit Logs Column Types
-- Converts potential BYTEA/BLOB columns to TEXT to support LOWER() and string operations.
-- H2 compatible: Direct ALTER COLUMN TYPE without USING clause.

-- 1. Table: audit_logs
ALTER TABLE audit_logs ALTER COLUMN description TYPE TEXT;
ALTER TABLE audit_logs ALTER COLUMN old_value TYPE TEXT;
ALTER TABLE audit_logs ALTER COLUMN new_value TYPE TEXT;
