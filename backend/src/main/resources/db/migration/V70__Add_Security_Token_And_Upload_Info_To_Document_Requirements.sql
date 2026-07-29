-- V70: Add security_token, token_expires_at, last_uploaded_by, last_uploaded_at to document_requirements
ALTER TABLE document_requirements ADD COLUMN IF NOT EXISTS security_token VARCHAR(255);
ALTER TABLE document_requirements ADD COLUMN IF NOT EXISTS token_expires_at TIMESTAMP;
ALTER TABLE document_requirements ADD COLUMN IF NOT EXISTS last_uploaded_by VARCHAR(255);
ALTER TABLE document_requirements ADD COLUMN IF NOT EXISTS last_uploaded_at TIMESTAMP;
