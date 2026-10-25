-- V144: 규제보고 (Vigilance & MDR) 및 제품 회수 (Product Recall) 관리 모듈 신설
-- 표준 규격: 의료기기법 제31조·제34조, 21 CFR Part 803 (MDR) / Part 7 (Recall), EU MDR 2017/745 Art. 87, 화장품법 제5조의2·제5조의3

-- 1. 규제보고 (Vigilance Reports) 마스터 테이블 생성
CREATE TABLE IF NOT EXISTS vigilance_reports (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    report_number VARCHAR(50) NOT NULL UNIQUE,
    title VARCHAR(200) NOT NULL,
    authority_type VARCHAR(30) NOT NULL, -- MFDS, FDA, EU_MDR
    regulatory_type VARCHAR(30) NOT NULL, -- COSMETIC, MEDICAL_DEVICE, GENERAL
    report_classification VARCHAR(50) NOT NULL,
    incident_severity VARCHAR(40) NOT NULL,
    source_type VARCHAR(40) NOT NULL,
    source_id BIGINT,
    source_number VARCHAR(50),
    source_description TEXT,

    item_code VARCHAR(100),
    product_name VARCHAR(200),
    lot_number VARCHAR(100),
    is_lot_unknown BOOLEAN DEFAULT FALSE,

    awareness_date DATE NOT NULL,
    due_date DATE NOT NULL,
    submission_date DATE,
    submission_status VARCHAR(30) NOT NULL DEFAULT 'DRAFT',
    authority_submission_number VARCHAR(100),

    incident_description TEXT NOT NULL,
    patient_impact TEXT,
    preliminary_causality TEXT,
    reporter_name VARCHAR(100),
    reported_to_department VARCHAR(100),
    action_taken TEXT,

    capa_required BOOLEAN DEFAULT FALSE,
    capa_id BIGINT,
    capa_number VARCHAR(50),

    is_deleted BOOLEAN DEFAULT FALSE,
    created_by VARCHAR(100) NOT NULL,
    updated_by VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    version BIGINT DEFAULT 0
);

-- 2. 제품 회수 (Product Recalls) 마스터 테이블 생성
CREATE TABLE IF NOT EXISTS product_recalls (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    recall_number VARCHAR(50) NOT NULL UNIQUE,
    title VARCHAR(200) NOT NULL,
    recall_class VARCHAR(30) NOT NULL, -- CLASS_1, CLASS_2, CLASS_3
    authority_type VARCHAR(30) NOT NULL, -- MFDS, FDA, EU_MDR
    regulatory_type VARCHAR(30) NOT NULL, -- COSMETIC, MEDICAL_DEVICE, GENERAL
    status VARCHAR(30) NOT NULL DEFAULT 'INITIATED',

    item_code VARCHAR(100) NOT NULL,
    product_name VARCHAR(200) NOT NULL,
    lot_number VARCHAR(100) NOT NULL,
    distribution_start_date DATE,
    distribution_end_date DATE,

    initiation_date DATE NOT NULL,
    authority_report_date DATE,
    authority_approval_number VARCHAR(100),

    recall_reason TEXT NOT NULL,
    health_hazard_assessment TEXT,

    shipped_quantity INT NOT NULL DEFAULT 0,
    recalled_quantity INT NOT NULL DEFAULT 0,
    quarantined_quantity INT NOT NULL DEFAULT 0,
    disposed_quantity INT NOT NULL DEFAULT 0,
    unretrieved_quantity INT NOT NULL DEFAULT 0,
    recovery_rate DOUBLE PRECISION NOT NULL DEFAULT 0.0,

    disposal_method VARCHAR(200),
    disposal_date DATE,
    disposal_witness VARCHAR(100),

    assigned_leader VARCHAR(100) NOT NULL,
    capa_id BIGINT,
    capa_number VARCHAR(50),

    closure_summary TEXT,
    closed_date DATE,
    closed_by VARCHAR(100),

    is_deleted BOOLEAN DEFAULT FALSE,
    created_by VARCHAR(100) NOT NULL,
    updated_by VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    version BIGINT DEFAULT 0
);

-- 3. 고성능 인덱스 생성 (12종)
CREATE INDEX IF NOT EXISTS idx_vig_number ON vigilance_reports(report_number);
CREATE INDEX IF NOT EXISTS idx_vig_authority ON vigilance_reports(authority_type);
CREATE INDEX IF NOT EXISTS idx_vig_status ON vigilance_reports(submission_status);
CREATE INDEX IF NOT EXISTS idx_vig_due_date ON vigilance_reports(due_date);
CREATE INDEX IF NOT EXISTS idx_vig_awareness_date ON vigilance_reports(awareness_date);
CREATE INDEX IF NOT EXISTS idx_vig_deleted ON vigilance_reports(is_deleted);

CREATE INDEX IF NOT EXISTS idx_recall_number ON product_recalls(recall_number);
CREATE INDEX IF NOT EXISTS idx_recall_class ON product_recalls(recall_class);
CREATE INDEX IF NOT EXISTS idx_recall_status ON product_recalls(status);
CREATE INDEX IF NOT EXISTS idx_recall_item_lot ON product_recalls(item_code, lot_number);
CREATE INDEX IF NOT EXISTS idx_recall_init_date ON product_recalls(initiation_date);
CREATE INDEX IF NOT EXISTS idx_recall_deleted ON product_recalls(is_deleted);

-- 4. 동적 메뉴 및 시스템 권한 등록
INSERT INTO screen_menus (
    menu_code, menu_name, menu_path, icon_name, parent_menu_code,
    sort_order, is_active, required_role, created_at, updated_at
) VALUES (
    'SYS_VIGILANCE_RECALL', '규제보고 및 회수 (Vigilance & Recall)', '/vigilance-recall', 'AlertTriangle', 'QUALITY_ROOT',
    67, true, 'ROLE_USER', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
) ON CONFLICT (menu_code) DO UPDATE SET
    menu_name = EXCLUDED.menu_name,
    menu_path = EXCLUDED.menu_path,
    icon_name = EXCLUDED.icon_name,
    sort_order = EXCLUDED.sort_order,
    is_active = true,
    updated_at = CURRENT_TIMESTAMP;

INSERT INTO system_permissions (
    permission_code, permission_name, description, category, created_at, updated_at
) VALUES 
('VIEW_VIGILANCE', '규제보고/회수 조회', '국가별 이상사례 보고 및 제품 회수 대사 현황을 조회할 수 있는 권한', 'QUALITY', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('MANAGE_VIGILANCE', '규제보고/회수 관리', 'Vigilance 보고 기안/제출, 회수 계획 수립, 수량 대사 검증 및 종결할 수 있는 권한', 'QUALITY', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (permission_code) DO NOTHING;

-- 5. 규제 표준 가이드(Regulatory Guide) 등록
INSERT INTO system_guides (
    guide_key, title, subtitle, standard_code, category,
    compliance_summary, audit_point, practical_tips, created_at, updated_at
) VALUES (
    'vigilanceRecall',
    '규제보고 (Vigilance) 및 제품 회수 (Recall) 관리 규정',
    '의료기기법 제31조/제34조, 21 CFR Part 803/Part 7, EU MDR 2017/745 Art.87, 화장품법 제5조의2/제5조의3 표준 규정',
    'ISO 13485:2016 §8.2.3 / 21 CFR 803, 7 / EU MDR Art. 87',
    'QUALITY',
    '품질책임자는 시판 후 제품의 이상사례 및 부작용 발생 시 인지 즉시 국가별 법정 기한(식약처 사망 7일/중대 15일, FDA 5일/30일 MDR, EU MDR 2일/10일/15일)을 준수하여 보고해야 합니다. 또한 결함 제품의 회수 발생 시 위해성 등급(1~3등급)을 분류하고, 출고 총량 대비 회수·격리·폐기·미회수 수량의 100% 대사(Reconciliation) 일치를 입증해야 최종 종결할 수 있습니다.',
    '① 법정 보고 기한을 초과하여 규제당국에 늑장 보고된 이력이 존재하는가?
② 회수 완료 시 출고 수량과 회수/폐기/미회수 수량의 합계가 100% 일치하도록 수량 대사가 이루어졌는가?
③ 회수 및 중대 이상사례 발생 시 근본원인 분석 및 재발방지 시정조치(CAPA)가 연계되었는가?',
    '• 기한 계산 팁: 인지일(Awareness Date)을 기준으로 달력일(Calendar Days)이 자동 계산되므로 D-3 알림 발생 즉시 초동 보고서를 제출하세요.
• 회수 수량 대사 팁: 미회수(Unretrieved) 수량은 소비자 소진 또는 반품 불가 사유를 명시해야 종결 가드를 통과할 수 있습니다.',
    CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
) ON CONFLICT (guide_key) DO UPDATE SET
    title = EXCLUDED.title,
    subtitle = EXCLUDED.subtitle,
    standard_code = EXCLUDED.standard_code,
    compliance_summary = EXCLUDED.compliance_summary,
    audit_point = EXCLUDED.audit_point,
    practical_tips = EXCLUDED.practical_tips,
    updated_at = CURRENT_TIMESTAMP;

-- 6. 초기 시드 데이터 등록 (샘플 2건)
INSERT INTO vigilance_reports (
    report_number, title, authority_type, regulatory_type, report_classification,
    incident_severity, source_type, source_number, item_code, product_name,
    lot_number, is_lot_unknown, awareness_date, due_date, submission_date,
    submission_status, authority_submission_number, incident_description,
    patient_impact, preliminary_causality, reporter_name, reported_to_department,
    action_taken, capa_required, capa_number, created_by, updated_by
) VALUES 
(
    'VIG-202610-001', '[식약처 15일] 센텔라 보습 크림 피부 알레르기 유해사례 신속보고',
    'MFDS', 'COSMETIC', 'MFDS_COSMETIC_SERIOUS_15D', 'HOSPITALIZATION',
    'COMPLAINT', 'CLM-20260426-001', 'PARENT-001', '프리미엄 센텔라 수분 크림_JP-OFF',
    'LOT-20260401-A', false, CURRENT_DATE, CURRENT_DATE + INTERVAL '15 day', NULL,
    'DRAFT', NULL, '고객 사용 후 접촉성 피부염으로 피부과 통원 치료 발생. 인과관계 판정 결과 Probable.',
    '환자 피부과 치료 및 호전 중', '특정 로트의 보존제 분산 불균일 가능성 추정',
    '품질보증팀 이영희', '식약처 바이오생약국 화장품정책과',
    '해당 로트 출하 잠정 HOLD 및 고객 보상 완료', true, 'CAPA-202610-001', 'admin', 'admin'
),
(
    'VIG-202610-002', '[FDA 30-Day MDR] 레이저 수술기 팁 과열 기능이상 보고',
    'FDA', 'MEDICAL_DEVICE', 'FDA_30DAY_MDR', 'MALFUNCTION_RISK',
    'NCR', 'NCR-202610-001', 'MD-SURG-01', '정밀 레이저 수술 핸드피스 2.0',
    'MDL-202609-003', false, CURRENT_DATE - INTERVAL '10 day', CURRENT_DATE + INTERVAL '20 day', CURRENT_DATE - INTERVAL '2 day',
    'SUBMITTED', 'FDA-MDR-2026-99881', '레이저 팁 50시간 사용 후 내부 센서 단선으로 일시 과열 감지. 환자 부상 없음.',
    '환자 상해 없음 (안전 인터록 정상 작동하여 레이저 자동 차단)', '내부 커넥터 압착 불량',
    '글로벌 RA팀 김철수', 'FDA CDRH MDR Processing Center',
    '전체 출하분 펌웨어 점검 및 안전 인터록 검증 완료', true, 'CAPA-202610-002', 'admin', 'admin'
)
ON CONFLICT (report_number) DO NOTHING;

INSERT INTO product_recalls (
    recall_number, title, recall_class, authority_type, regulatory_type,
    status, item_code, product_name, lot_number, distribution_start_date,
    distribution_end_date, initiation_date, authority_report_date, authority_approval_number,
    recall_reason, healthHazardAssessment, shipped_quantity, recalled_quantity,
    quarantined_quantity, disposed_quantity, unretrieved_quantity, recovery_rate,
    disposal_method, disposal_date, disposal_witness, assigned_leader,
    capa_number, closure_summary, created_by, updated_by
) VALUES 
(
    'RCL-202610-001', '센텔라 수분 크림 특정 LOT 2등급 자진 회수',
    'CLASS_2', 'MFDS', 'COSMETIC', 'RECONCILIATION',
    'PARENT-001', '프리미엄 센텔라 수분 크림_JP-OFF', 'LOT-20260401-A',
    CURRENT_DATE - INTERVAL '60 day', CURRENT_DATE - INTERVAL '20 day',
    CURRENT_DATE - INTERVAL '14 day', CURRENT_DATE - INTERVAL '12 day', 'MFDS-RCL-2026-044',
    '유통 제품 중 일부에서 점도 저하 및 유화 안정성 불균일 발생으로 자진 회수 결정',
    '피부 자극성 시험 결과 비자극 판정되었으나 제형 분리 현상으로 사용상 불편 초래 (2등급)',
    5000, 4200, 500, 0, 300, 94.0,
    '고온 열분해 및 친환경 폐기 위탁', NULL, '환경안전팀 박팀장', '품질본부장 김상우',
    'CAPA-202610-001', '유통처 98% 회수 공표 완료, 현재 반품 재고 집계 및 최종 대사 진행 중',
    'admin', 'admin'
)
ON CONFLICT (recall_number) DO NOTHING;
