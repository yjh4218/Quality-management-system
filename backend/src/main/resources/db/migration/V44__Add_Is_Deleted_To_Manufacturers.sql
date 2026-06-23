-- [MIGRATION V44] Add is_deleted and deleted_at columns to manufacturers table
ALTER TABLE manufacturers ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;
ALTER TABLE manufacturers ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
