-- ═══════════════════════════════════════════
-- V117: 결재 문서유형 연동 화면 컬럼 추가 및 결재 열람(읽음) 이력 테이블 생성
-- ═══════════════════════════════════════════

-- 1. approval_doc_types에 source_screen (연동 화면 명칭) 컬럼 추가
ALTER TABLE approval_doc_types ADD COLUMN IF NOT EXISTS source_screen VARCHAR(100);

-- 2. 기존 결재 문서유형 표준 연동 화면명 매핑 업데이트
UPDATE approval_doc_types SET source_screen = '클레임 관리 (대책보고서)' WHERE code = 'CLAIM_REPORT' AND (source_screen IS NULL OR source_screen = '');
UPDATE approval_doc_types SET source_screen = '입고품질관리 (출하승인서)' WHERE code = 'MARKET_RELEASE' AND (source_screen IS NULL OR source_screen = '');
UPDATE approval_doc_types SET source_screen = '공정 품질 감사 (생산감리)' WHERE code = 'PROD_AUDIT' AND (source_screen IS NULL OR source_screen = '');
UPDATE approval_doc_types SET source_screen = '일반 결재 기안서' WHERE code = 'GENERAL' AND (source_screen IS NULL OR source_screen = '');
UPDATE approval_doc_types SET source_screen = '제조사 Audit 관리' WHERE code = 'MFR_AUDIT' AND (source_screen IS NULL OR source_screen = '');

-- 3. approval_document_reads 테이블 생성 (사용자별 결재 문서 읽음 상태 영속화)
CREATE TABLE IF NOT EXISTS approval_document_reads (
    id BIGSERIAL PRIMARY KEY,
    document_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    read_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_approval_doc_user_read UNIQUE (document_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_approval_doc_reads_user ON approval_document_reads(user_id);
CREATE INDEX IF NOT EXISTS idx_approval_doc_reads_doc ON approval_document_reads(document_id);
