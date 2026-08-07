-- V47_1: V48 데이터 시딩 전 notification_settings 테이블 및 필수 컬럼 안전 보강
CREATE TABLE IF NOT EXISTS notification_settings (
    id BIGSERIAL PRIMARY KEY,
    event_type VARCHAR(100),
    event_name VARCHAR(255),
    display_name VARCHAR(255),
    recipient_role VARCHAR(100),
    target_roles VARCHAR(255),
    email_enabled BOOLEAN DEFAULT TRUE,
    in_app_enabled BOOLEAN DEFAULT TRUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE notification_settings ADD COLUMN IF NOT EXISTS event_type VARCHAR(100);
ALTER TABLE notification_settings ADD COLUMN IF NOT EXISTS event_name VARCHAR(255);
ALTER TABLE notification_settings ADD COLUMN IF NOT EXISTS display_name VARCHAR(255);
ALTER TABLE notification_settings ADD COLUMN IF NOT EXISTS recipient_role VARCHAR(100);
ALTER TABLE notification_settings ADD COLUMN IF NOT EXISTS target_roles VARCHAR(255);
ALTER TABLE notification_settings ADD COLUMN IF NOT EXISTS email_enabled BOOLEAN DEFAULT TRUE;
ALTER TABLE notification_settings ADD COLUMN IF NOT EXISTS in_app_enabled BOOLEAN DEFAULT TRUE;
ALTER TABLE notification_settings ADD COLUMN IF NOT EXISTS description TEXT;
