-- Add Critical Claim integration fields to claims table
ALTER TABLE claims ADD COLUMN IF NOT EXISTS is_critical_claim BOOLEAN DEFAULT false;
ALTER TABLE claims ADD COLUMN IF NOT EXISTS critical_request_status VARCHAR(50) DEFAULT 'PENDING';
