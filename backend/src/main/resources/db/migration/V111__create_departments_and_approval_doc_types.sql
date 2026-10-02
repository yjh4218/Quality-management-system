-- ═══════════════════════════════════════════
-- departments 테이블 (멀티 테넌트: 더파운더즈 + 각 제조사)
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS departments (
    id BIGSERIAL PRIMARY KEY,
    company_name VARCHAR(100) NOT NULL,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(100) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    display_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_departments_company_code UNIQUE (company_name, code)
);

-- ═══════════════════════════════════════════
-- department_roles 테이블 (부서 내 역할 마스터 — 부서장 이력 관리)
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS department_roles (
    id BIGSERIAL PRIMARY KEY,
    department_id BIGINT NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    role_code VARCHAR(30) NOT NULL,           -- DEPT_HEAD / DEPUTY_HEAD / TEAM_LEAD
    user_id BIGINT NOT NULL REFERENCES users(id),
    is_active BOOLEAN NOT NULL DEFAULT true,
    started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_dept_roles_active ON department_roles(department_id, role_code, is_active);

-- ═══════════════════════════════════════════
-- approval_doc_types 테이블
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS approval_doc_types (
    id BIGSERIAL PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    source_table VARCHAR(100) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ═══════════════════════════════════════════
-- notification_rules 테이블 (결재 알림)
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS notification_rules (
    id BIGSERIAL PRIMARY KEY,
    event_type VARCHAR(30) NOT NULL,
    channel VARCHAR(20) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true
);

-- ═══════════════════════════════════════════
-- 기본 부서 시드 (더파운더즈) - ANSI SQL WHERE NOT EXISTS 패턴
-- ═══════════════════════════════════════════
INSERT INTO departments (company_name, code, name, display_order)
SELECT '더파운더즈', 'HR', '인사', 1 WHERE NOT EXISTS (SELECT 1 FROM departments WHERE company_name = '더파운더즈' AND code = 'HR');

INSERT INTO departments (company_name, code, name, display_order)
SELECT '더파운더즈', 'FIN', '재무', 2 WHERE NOT EXISTS (SELECT 1 FROM departments WHERE company_name = '더파운더즈' AND code = 'FIN');

INSERT INTO departments (company_name, code, name, display_order)
SELECT '더파운더즈', 'QC', '품질', 3 WHERE NOT EXISTS (SELECT 1 FROM departments WHERE company_name = '더파운더즈' AND code = 'QC');

INSERT INTO departments (company_name, code, name, display_order)
SELECT '더파운더즈', 'DOM_SALES', '국내영업', 4 WHERE NOT EXISTS (SELECT 1 FROM departments WHERE company_name = '더파운더즈' AND code = 'DOM_SALES');

INSERT INTO departments (company_name, code, name, display_order)
SELECT '더파운더즈', 'INTL_SALES', '해외영업', 5 WHERE NOT EXISTS (SELECT 1 FROM departments WHERE company_name = '더파운더즈' AND code = 'INTL_SALES');

INSERT INTO departments (company_name, code, name, display_order)
SELECT '더파운더즈', 'PLANNING', '상품기획', 6 WHERE NOT EXISTS (SELECT 1 FROM departments WHERE company_name = '더파운더즈' AND code = 'PLANNING');

INSERT INTO departments (company_name, code, name, display_order)
SELECT '더파운더즈', 'DOM_MKT', '국내 마케팅', 7 WHERE NOT EXISTS (SELECT 1 FROM departments WHERE company_name = '더파운더즈' AND code = 'DOM_MKT');

INSERT INTO departments (company_name, code, name, display_order)
SELECT '더파운더즈', 'INTL_MKT', '해외 마케팅', 8 WHERE NOT EXISTS (SELECT 1 FROM departments WHERE company_name = '더파운더즈' AND code = 'INTL_MKT');

-- ═══════════════════════════════════════════
-- 기본 결재 문서유형 시드
-- ═══════════════════════════════════════════
INSERT INTO approval_doc_types (code, name, source_table)
SELECT 'PROD_AUDIT', '생산감리', 'production_audits' WHERE NOT EXISTS (SELECT 1 FROM approval_doc_types WHERE code = 'PROD_AUDIT');

INSERT INTO approval_doc_types (code, name, source_table)
SELECT 'MFR_AUDIT', '제조사 Audit', 'manufacturer_audits' WHERE NOT EXISTS (SELECT 1 FROM approval_doc_types WHERE code = 'MFR_AUDIT');

INSERT INTO approval_doc_types (code, name, source_table)
SELECT 'CX_CLAIM', 'CX 클레임', 'claims' WHERE NOT EXISTS (SELECT 1 FROM approval_doc_types WHERE code = 'CX_CLAIM');

-- ═══════════════════════════════════════════
-- 기본 알림 규칙 시드
-- ═══════════════════════════════════════════
INSERT INTO notification_rules (event_type, channel, is_active)
SELECT 'MY_TURN', 'IN_APP', true WHERE NOT EXISTS (SELECT 1 FROM notification_rules WHERE event_type = 'MY_TURN' AND channel = 'IN_APP');

INSERT INTO notification_rules (event_type, channel, is_active)
SELECT 'MY_TURN', 'EMAIL', true WHERE NOT EXISTS (SELECT 1 FROM notification_rules WHERE event_type = 'MY_TURN' AND channel = 'EMAIL');

INSERT INTO notification_rules (event_type, channel, is_active)
SELECT 'REFERENCE_TAGGED', 'IN_APP', true WHERE NOT EXISTS (SELECT 1 FROM notification_rules WHERE event_type = 'REFERENCE_TAGGED' AND channel = 'IN_APP');

INSERT INTO notification_rules (event_type, channel, is_active)
SELECT 'REFERENCE_TAGGED', 'EMAIL', false WHERE NOT EXISTS (SELECT 1 FROM notification_rules WHERE event_type = 'REFERENCE_TAGGED' AND channel = 'EMAIL');

INSERT INTO notification_rules (event_type, channel, is_active)
SELECT 'REJECTED', 'IN_APP', true WHERE NOT EXISTS (SELECT 1 FROM notification_rules WHERE event_type = 'REJECTED' AND channel = 'IN_APP');

INSERT INTO notification_rules (event_type, channel, is_active)
SELECT 'REJECTED', 'EMAIL', true WHERE NOT EXISTS (SELECT 1 FROM notification_rules WHERE event_type = 'REJECTED' AND channel = 'EMAIL');

INSERT INTO notification_rules (event_type, channel, is_active)
SELECT 'APPROVED', 'IN_APP', true WHERE NOT EXISTS (SELECT 1 FROM notification_rules WHERE event_type = 'APPROVED' AND channel = 'IN_APP');

INSERT INTO notification_rules (event_type, channel, is_active)
SELECT 'APPROVED', 'EMAIL', false WHERE NOT EXISTS (SELECT 1 FROM notification_rules WHERE event_type = 'APPROVED' AND channel = 'EMAIL');

INSERT INTO notification_rules (event_type, channel, is_active)
SELECT 'RECALLED', 'IN_APP', true WHERE NOT EXISTS (SELECT 1 FROM notification_rules WHERE event_type = 'RECALLED' AND channel = 'IN_APP');

INSERT INTO notification_rules (event_type, channel, is_active)
SELECT 'RECALLED', 'EMAIL', false WHERE NOT EXISTS (SELECT 1 FROM notification_rules WHERE event_type = 'RECALLED' AND channel = 'EMAIL');
