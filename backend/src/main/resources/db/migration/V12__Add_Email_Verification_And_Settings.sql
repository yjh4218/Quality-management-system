-- V12: Add Email Verification and System Settings

-- 1. Create System Setting table to store SMTP config
CREATE TABLE system_settings (
    setting_key VARCHAR(100) PRIMARY KEY,
    setting_value TEXT NOT NULL,
    description VARCHAR(255),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Add email verification fields to users
ALTER TABLE users 
ADD COLUMN email_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN verification_token VARCHAR(255);

-- 3. Set existing users to be verified so they can log in
UPDATE users SET email_verified = TRUE;

-- 4. Initial placeholder for SMTP settings (Optional, these can be empty initially)
-- INSERT INTO system_settings (setting_key, setting_value, description) VALUES ('SMTP_HOST', 'smtp.gmail.com', 'SMTP Server Host');
-- INSERT INTO system_settings (setting_key, setting_value, description) VALUES ('SMTP_PORT', '587', 'SMTP Server Port');
-- INSERT INTO system_settings (setting_key, setting_value, description) VALUES ('SMTP_USERNAME', '', 'SMTP Sender Username');
-- INSERT INTO system_settings (setting_key, setting_value, description) VALUES ('SMTP_PASSWORD', '', 'SMTP Sender App Password (Encrypted)');
