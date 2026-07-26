-- V67: Fix ENTITY_ID NOT NULL constraint in audit_logs table
ALTER TABLE audit_logs ALTER COLUMN entity_id DROP NOT NULL;
