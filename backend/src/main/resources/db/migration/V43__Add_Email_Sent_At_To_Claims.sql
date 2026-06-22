-- [MIGRATION V43] Add email_sent_at column to claims table
ALTER TABLE claims ADD COLUMN IF NOT EXISTS email_sent_at TIMESTAMP;
