-- V132__add_audit_log_record_hash.sql
-- H2 및 PostgreSQL 호환: 21 CFR Part 11 / ISO 13485 감사추적 데이터 무결성 및 변조 방지 해시 컬럼 추가

ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS record_hash VARCHAR(64);
ALTER TABLE audit_logs_archive ADD COLUMN IF NOT EXISTS record_hash VARCHAR(64);
