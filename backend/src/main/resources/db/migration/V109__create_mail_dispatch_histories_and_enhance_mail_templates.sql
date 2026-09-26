-- V109: Create mail_dispatch_histories table and enhance mail_templates for history retention & auto-reminder

-- 1. 메일 양식 테이블 컬럼 추가 (이력 보관 수량 및 자동 리마인드 설정)
ALTER TABLE mail_templates ADD COLUMN IF NOT EXISTS max_history_count INT DEFAULT 20;
ALTER TABLE mail_templates ADD COLUMN IF NOT EXISTS auto_reminder_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE mail_templates ADD COLUMN IF NOT EXISTS reminder_interval_days INT DEFAULT 3;
ALTER TABLE mail_templates ADD COLUMN IF NOT EXISTS max_reminder_count INT DEFAULT 2;
ALTER TABLE mail_templates ADD COLUMN IF NOT EXISTS reminder_template_code VARCHAR(100);

-- 2. 메일 발송 및 회신 이력 통합 테이블 생성
CREATE TABLE IF NOT EXISTS mail_dispatch_histories (
    id BIGSERIAL PRIMARY KEY,
    domain VARCHAR(50) NOT NULL,
    source_id BIGINT NOT NULL,
    source_number VARCHAR(100),
    template_code VARCHAR(100),
    template_name VARCHAR(255),
    manufacturer VARCHAR(255),
    recipient_email VARCHAR(500) NOT NULL,
    subject VARCHAR(500) NOT NULL,
    body TEXT,
    sent_by VARCHAR(100),
    sent_at TIMESTAMP NOT NULL,
    dispatch_type VARCHAR(50) DEFAULT 'MANUAL',
    reminder_count INT DEFAULT 0,
    status VARCHAR(50) DEFAULT 'PENDING',
    replied_at TIMESTAMP,
    lead_time_hours DOUBLE PRECISION,
    reply_remarks TEXT,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. 고속 조회를 위한 복합 인덱스 (N+1 및 풀스캔 방지)
CREATE INDEX IF NOT EXISTS idx_mail_hist_domain_source ON mail_dispatch_histories(domain, source_id, is_deleted);
CREATE INDEX IF NOT EXISTS idx_mail_hist_manufacturer ON mail_dispatch_histories(manufacturer, is_deleted);
CREATE INDEX IF NOT EXISTS idx_mail_hist_status ON mail_dispatch_histories(status, is_deleted);
CREATE INDEX IF NOT EXISTS idx_mail_hist_sent_at ON mail_dispatch_histories(sent_at);
