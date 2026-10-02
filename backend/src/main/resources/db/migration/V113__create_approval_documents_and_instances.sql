-- ═══════════════════════════════════════════
-- approval_documents 테이블
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS approval_documents (
    id BIGSERIAL PRIMARY KEY,
    doc_type_id BIGINT NOT NULL REFERENCES approval_doc_types(id),
    source_record_id BIGINT NOT NULL,
    template_id BIGINT NOT NULL REFERENCES approval_templates(id),
    title VARCHAR(255) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    submitted_by BIGINT NOT NULL REFERENCES users(id),
    submitted_at TIMESTAMP,
    completed_at TIMESTAMP,
    parent_document_id BIGINT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ═══════════════════════════════════════════
-- approval_step_instances 테이블
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS approval_step_instances (
    id BIGSERIAL PRIMARY KEY,
    document_id BIGINT NOT NULL REFERENCES approval_documents(id) ON DELETE CASCADE,
    step_order INT NOT NULL,
    step_type VARCHAR(20) NOT NULL,
    assignee_user_id BIGINT NOT NULL REFERENCES users(id),
    is_adhoc BOOLEAN NOT NULL DEFAULT false,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    comment TEXT,
    processed_at TIMESTAMP,
    read_at TIMESTAMP
);

-- ═══════════════════════════════════════════
-- approval_history_logs 테이블
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS approval_history_logs (
    id BIGSERIAL PRIMARY KEY,
    document_id BIGINT NOT NULL REFERENCES approval_documents(id) ON DELETE CASCADE,
    actor_user_id BIGINT NOT NULL REFERENCES users(id),
    action VARCHAR(30) NOT NULL,
    detail_json TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 성능 인덱스
CREATE INDEX IF NOT EXISTS idx_approval_docs_status ON approval_documents(status);
CREATE INDEX IF NOT EXISTS idx_approval_docs_submitted_by ON approval_documents(submitted_by);
CREATE INDEX IF NOT EXISTS idx_approval_docs_doc_type ON approval_documents(doc_type_id);
CREATE INDEX IF NOT EXISTS idx_approval_step_inst_doc ON approval_step_instances(document_id);
CREATE INDEX IF NOT EXISTS idx_approval_step_inst_assignee ON approval_step_instances(assignee_user_id, status);
CREATE INDEX IF NOT EXISTS idx_approval_history_doc ON approval_history_logs(document_id);
