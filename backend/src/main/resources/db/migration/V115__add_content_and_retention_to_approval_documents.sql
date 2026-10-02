-- ═══════════════════════════════════════════
-- V115: approval_documents content 및 retention_period 컬럼 추가
-- ═══════════════════════════════════════════
ALTER TABLE approval_documents ADD COLUMN IF NOT EXISTS content TEXT;
ALTER TABLE approval_documents ADD COLUMN IF NOT EXISTS retention_period VARCHAR(50);
