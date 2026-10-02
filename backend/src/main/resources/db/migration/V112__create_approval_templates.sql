-- ═══════════════════════════════════════════
-- approval_templates 테이블
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS approval_templates (
    id BIGSERIAL PRIMARY KEY,
    doc_type_id BIGINT NOT NULL REFERENCES approval_doc_types(id),
    version INT NOT NULL DEFAULT 1,
    is_current BOOLEAN NOT NULL DEFAULT true,
    created_by BIGINT NOT NULL REFERENCES users(id),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ═══════════════════════════════════════════
-- approval_template_steps 테이블
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS approval_template_steps (
    id BIGSERIAL PRIMARY KEY,
    template_id BIGINT NOT NULL REFERENCES approval_templates(id) ON DELETE CASCADE,
    step_order INT NOT NULL,
    step_type VARCHAR(20) NOT NULL,
    assignee_type VARCHAR(20) NOT NULL,
    assignee_role VARCHAR(50),
    assignee_department_id BIGINT,
    assignee_user_id BIGINT,
    condition_json TEXT,
    is_required BOOLEAN NOT NULL DEFAULT true
);

CREATE INDEX IF NOT EXISTS idx_tpl_steps_template_id ON approval_template_steps(template_id);
