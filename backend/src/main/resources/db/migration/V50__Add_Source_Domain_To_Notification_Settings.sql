-- V50: Add source_domain and source_action to notification_settings
ALTER TABLE notification_settings ADD COLUMN source_domain VARCHAR(100);
ALTER TABLE notification_settings ADD COLUMN source_action VARCHAR(50) DEFAULT 'CREATE';

-- Update existing records with default source domain and actions
UPDATE notification_settings SET source_domain = 'CLAIM', source_action = 'CREATE' WHERE event_type = 'NEW_CLAIM_SHARE';
UPDATE notification_settings SET source_domain = 'CLAIM', source_action = 'UPDATE' WHERE event_type = 'MFR_SUBMIT_CAPA';
UPDATE notification_settings SET source_domain = 'CLAIM', source_action = 'UPDATE' WHERE event_type = 'RE_REQUEST_CAPA';
UPDATE notification_settings SET source_domain = 'CLAIM', source_action = 'UPDATE' WHERE event_type = 'CLAIM_STATUS_CHANGE';
UPDATE notification_settings SET source_domain = 'AUDIT', source_action = 'CREATE' WHERE event_type = 'NEW_AUDIT';
