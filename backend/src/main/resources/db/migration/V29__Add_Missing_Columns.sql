-- [MIGRATION V29] 누락된 컬럼 추가
-- audit_logs.change_detail, bug_reports.server_error, bug_reports.updated_at

-- 1. audit_logs 테이블에 change_detail 컬럼 추가
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS change_detail TEXT;

-- 2. bug_reports 테이블에 server_error, updated_at 컬럼 추가
ALTER TABLE bug_reports ADD COLUMN IF NOT EXISTS server_error TEXT;
ALTER TABLE bug_reports ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP;
