-- V131__align_audit_logs_archive_schema.sql
-- H2 및 PostgreSQL 호환: audit_logs_archive 테이블 스키마를 최신 audit_logs와 정렬하여 감사추적 보존 무결성 확보

ALTER TABLE audit_logs_archive ADD COLUMN IF NOT EXISTS modifier_id BIGINT;
ALTER TABLE audit_logs_archive ADD COLUMN IF NOT EXISTS modifier_username VARCHAR(50);
ALTER TABLE audit_logs_archive ADD COLUMN IF NOT EXISTS modifier_name VARCHAR(100);
ALTER TABLE audit_logs_archive ADD COLUMN IF NOT EXISTS modifier_company VARCHAR(100);
ALTER TABLE audit_logs_archive ADD COLUMN IF NOT EXISTS change_detail TEXT;
