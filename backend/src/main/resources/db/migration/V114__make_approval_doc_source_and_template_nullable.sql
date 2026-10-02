-- ══════════════════════════════════════════════════════════════════════════════
-- V114: approval_documents의 source_record_id 및 template_id null 허용
-- 일반 품의서(GENERAL) 및 템플릿 미지정 임의결재 지원
-- ══════════════════════════════════════════════════════════════════════════════

ALTER TABLE approval_documents ALTER COLUMN source_record_id DROP NOT NULL;
ALTER TABLE approval_documents ALTER COLUMN template_id DROP NOT NULL;
