-- V130__add_bug_reports_is_read.sql
-- H2 및 PostgreSQL 호환: 버그 리포트 읽음 확인 필드 및 확인 일시 추가

ALTER TABLE bug_reports ADD COLUMN IF NOT EXISTS is_read BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE bug_reports ADD COLUMN IF NOT EXISTS read_at TIMESTAMP;
