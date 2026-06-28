-- Create notification_settings table
CREATE TABLE IF NOT EXISTS notification_settings (
    id BIGSERIAL PRIMARY KEY,
    event_type VARCHAR(100) NOT NULL UNIQUE,
    display_name VARCHAR(255) NOT NULL,
    target_roles VARCHAR(500)
);

-- Seed initial notification rules settings
INSERT INTO notification_settings (event_type, display_name, target_roles) 
VALUES ('MFR_SUBMIT_CAPA', '제조사 대책서 제출', 'ROLE_QUALITY,ROLE_RESPONSIBLE_SALES,ROLE_ADMIN')
ON CONFLICT (event_type) DO UPDATE SET target_roles = EXCLUDED.target_roles;

INSERT INTO notification_settings (event_type, display_name, target_roles) 
VALUES ('NEW_CLAIM_SHARE', '신규 클레임 공유', 'ROLE_MANUFACTURER')
ON CONFLICT (event_type) DO UPDATE SET target_roles = EXCLUDED.target_roles;

INSERT INTO notification_settings (event_type, display_name, target_roles) 
VALUES ('RE_REQUEST_CAPA', '대책 재요청 (반려)', 'ROLE_MANUFACTURER')
ON CONFLICT (event_type) DO UPDATE SET target_roles = EXCLUDED.target_roles;

INSERT INTO notification_settings (event_type, display_name, target_roles) 
VALUES ('NEW_AUDIT', '신규 생산감사 통보', 'ROLE_MANUFACTURER')
ON CONFLICT (event_type) DO UPDATE SET target_roles = EXCLUDED.target_roles;
