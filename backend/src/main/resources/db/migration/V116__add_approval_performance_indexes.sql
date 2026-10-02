-- ═══════════════════════════════════════════
-- V116: 전자결재 성능 최적화 복합 인덱스 추가
-- ═══════════════════════════════════════════

-- 원본 업무 레코드(클레임/감사 등) 기준 결재 상태 조회 복합 인덱스
CREATE INDEX IF NOT EXISTS idx_approval_docs_source_status ON approval_documents(source_record_id, status);

-- 문서 유형 및 원본 레코드 복합 조회 인덱스
CREATE INDEX IF NOT EXISTS idx_approval_docs_type_source ON approval_documents(doc_type_id, source_record_id);

-- 결재 문서별 결재 단계 순서 정렬 및 단계 조회 복합 인덱스
CREATE INDEX IF NOT EXISTS idx_approval_step_doc_order ON approval_step_instances(document_id, step_order);
