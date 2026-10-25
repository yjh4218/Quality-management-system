-- V145: 시설·설비, 교정(Calibration) 및 유지보수(PM), 청정실 환경모니터링 관리 모듈 신설
-- 표준 규격: ISO 13485:2016 §6.3, §6.4, §7.6 / ISO 22716:2007 §4, §5 / 21 CFR 820.70(g), 820.72

-- 1. 장비/설비/계측기 (Equipment) 마스터 테이블
CREATE TABLE IF NOT EXISTS equipments (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    equipment_code VARCHAR(50) NOT NULL UNIQUE,
    equipment_name VARCHAR(200) NOT NULL,
    category VARCHAR(50) NOT NULL,
    model_number VARCHAR(100),
    serial_number VARCHAR(100),
    manufacturer VARCHAR(150),
    supplier VARCHAR(150),
    installation_date DATE,
    installation_location VARCHAR(150),
    department VARCHAR(100),
    manager_name VARCHAR(100),
    status VARCHAR(50) NOT NULL DEFAULT 'OPERATIONAL',
    calibration_cycle_months INT DEFAULT 12,
    last_calibration_date DATE,
    next_calibration_due_date DATE,
    pm_cycle_months INT DEFAULT 6,
    last_pm_date DATE,
    next_pm_due_date DATE,
    criticality VARCHAR(30) NOT NULL DEFAULT 'MEDIUM',
    specifications TEXT,
    remarks TEXT,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_by VARCHAR(100),
    last_modified_by VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. 교정 이력 및 성적서 (Calibration Records) 테이블
CREATE TABLE IF NOT EXISTS calibration_records (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    calibration_number VARCHAR(50) NOT NULL UNIQUE,
    equipment_id BIGINT NOT NULL,
    calibration_date DATE NOT NULL,
    agency_type VARCHAR(40) NOT NULL,
    agency_name VARCHAR(150),
    certificate_number VARCHAR(100),
    certificate_file_url VARCHAR(500),
    result VARCHAR(40) NOT NULL,
    tolerance_standard VARCHAR(255),
    max_deviation VARCHAR(100),
    calibrated_by VARCHAR(100),
    verified_by VARCHAR(100),
    verification_date DATE,
    impact_assessment_required BOOLEAN DEFAULT FALSE,
    impact_assessment_notes TEXT,
    next_calibration_due_date DATE NOT NULL,
    remarks TEXT,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_by VARCHAR(100),
    last_modified_by VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_calibration_equipment FOREIGN KEY (equipment_id) REFERENCES equipments(id)
);

-- 3. 유지보수 및 예방보전 (Maintenance Records) 테이블
CREATE TABLE IF NOT EXISTS maintenance_records (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    maintenance_number VARCHAR(50) NOT NULL UNIQUE,
    equipment_id BIGINT NOT NULL,
    maintenance_type VARCHAR(40) NOT NULL,
    maintenance_date DATE NOT NULL,
    performer VARCHAR(150) NOT NULL,
    cost DECIMAL(12,2) DEFAULT 0,
    maintenance_result VARCHAR(40) NOT NULL,
    parts_replaced VARCHAR(500),
    downtime_hours DECIMAL(6,2) DEFAULT 0,
    details TEXT NOT NULL,
    verified_by VARCHAR(100),
    next_pm_due_date DATE,
    remarks TEXT,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_by VARCHAR(100),
    last_modified_by VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_maintenance_equipment FOREIGN KEY (equipment_id) REFERENCES equipments(id)
);

-- 4. 청정실/작업환경 모니터링 (Environmental Monitorings) 테이블
CREATE TABLE IF NOT EXISTS environmental_monitorings (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    monitoring_number VARCHAR(50) NOT NULL UNIQUE,
    area VARCHAR(50) NOT NULL,
    monitoring_date TIMESTAMP NOT NULL,
    temperature DECIMAL(5,2),
    humidity DECIMAL(5,2),
    differential_pressure DECIMAL(6,2),
    airborne_particles_05 INT,
    airborne_particles_50 INT,
    microbial_count INT,
    status VARCHAR(40) NOT NULL DEFAULT 'NORMAL',
    inspector VARCHAR(100) NOT NULL,
    corrective_action TEXT,
    remarks TEXT,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_by VARCHAR(100),
    last_modified_by VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_eq_status ON equipments(status);
CREATE INDEX IF NOT EXISTS idx_eq_category ON equipments(category);
CREATE INDEX IF NOT EXISTS idx_eq_cal_due ON equipments(next_calibration_due_date);
CREATE INDEX IF NOT EXISTS idx_eq_pm_due ON equipments(next_pm_due_date);
CREATE INDEX IF NOT EXISTS idx_cal_equipment ON calibration_records(equipment_id);
CREATE INDEX IF NOT EXISTS idx_cal_date ON calibration_records(calibration_date);
CREATE INDEX IF NOT EXISTS idx_cal_result ON calibration_records(result);
CREATE INDEX IF NOT EXISTS idx_mnt_equipment ON maintenance_records(equipment_id);
CREATE INDEX IF NOT EXISTS idx_mnt_date ON maintenance_records(maintenance_date);
CREATE INDEX IF NOT EXISTS idx_mnt_type ON maintenance_records(maintenance_type);
CREATE INDEX IF NOT EXISTS idx_env_area ON environmental_monitorings(area);
CREATE INDEX IF NOT EXISTS idx_env_date ON environmental_monitorings(monitoring_date);
CREATE INDEX IF NOT EXISTS idx_env_status ON environmental_monitorings(status);

-- 메뉴 등록
INSERT INTO system_menus (
    menu_code, menu_name, menu_path, icon_name, sort_order, is_active, created_at, updated_at
) VALUES (
    'SYS_FACILITY_MGMT', '시설·교정·유지보수', '/facilities', 'Tool', 38, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
) ON CONFLICT (menu_code) DO UPDATE SET
    menu_name = EXCLUDED.menu_name,
    menu_path = EXCLUDED.menu_path,
    icon_name = EXCLUDED.icon_name,
    sort_order = EXCLUDED.sort_order,
    is_active = true,
    updated_at = CURRENT_TIMESTAMP;

-- 시스템 권한 등록
INSERT INTO system_permissions (
    permission_code, permission_name, description, category, created_at, updated_at
) VALUES 
('FACILITY_VIEW', '시설/장비 및 교정 조회', '시설/설비 마스터, 교정 이력, 유지보수, 환경모니터링 데이터를 조회할 수 있는 권한', 'QUALITY', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('FACILITY_MANAGE', '시설/장비 및 교정 관리', '장비 등록, 교정 성적서 등록/판정, PM 유지보수, 환경모니터링 측정값 기록 및 관리 권한', 'QUALITY', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (permission_code) DO NOTHING;

-- 시스템 가이드 등록
INSERT INTO system_guides (
    guide_key, title, subtitle, standard_code, category,
    compliance_summary, audit_point, practical_tips, created_at, updated_at
) VALUES (
    'facilityManagement',
    '시설·교정 및 환경 모니터링 관리 규정',
    'ISO 13485:2016 §6.3/§6.4/§7.6, ISO 22716:2007 §4/§5, 21 CFR 820.70/820.72 표준 관리 규정',
    'ISO 13485:2016 §6.3, §6.4, §7.6 / 21 CFR 820.70, 820.72',
    'QUALITY',
    '제조 및 품질관리에 사용되는 모든 계측기, 시험장비 및 생산설비는 국가표준 소급성이 확보된 교정(Calibration)을 주기적으로 실시해야 하며, 허용오차 초과 또는 불합격(FAIL) 시 해당 장비로 시험/제조된 제품에 대한 품질 유효성 소급 영향평가를 강제해야 합니다. 또한 청정실 및 중요 제조환경은 온도, 습도, 차압, 미립자, 미생물 청정도를 정기 모니터링하여 기준 이탈(OOS) 시 즉각적인 시정조치를 수립해야 합니다.',
    '① 교정 유효기한이 경과된 미인증 장비가 생산/품질 시험에 사용된 사례가 있는가?
② 교정 불합격(OOS) 발생 시 해당 장비를 즉시 격리/사용중지 조치하고, 과거 생산 로트에 대한 영향평가(NCR/CAPA)를 수행하였는가?
③ 공조설비(HVAC) 및 청정실의 차압/온습도/미립자 기준 이탈 시 원인분석 및 환기 시정조치 기록이 존재하는가?',
    '• 교정 기한 관리: 교정 만료 30일 전 자동 알림이 표시되며, 공인기관(KOLAS) 성적서 번호와 성적서 PDF를 함께 업로드하세요.
• 불합격 가드: 교정 판정을 [불합격]으로 선택하면 해당 장비는 즉시 [사용 중지] 상태로 잠금 처리되며, 영향평가 사유를 작성해야 합니다.',
    CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
) ON CONFLICT (guide_key) DO UPDATE SET
    title = EXCLUDED.title,
    subtitle = EXCLUDED.subtitle,
    standard_code = EXCLUDED.standard_code,
    compliance_summary = EXCLUDED.compliance_summary,
    audit_point = EXCLUDED.audit_point,
    practical_tips = EXCLUDED.practical_tips,
    updated_at = CURRENT_TIMESTAMP;

-- 초기 시드 데이터 등록 (장비 3건, 교정 2건, 유지보수 2건, 환경모니터링 3건)
INSERT INTO equipments (
    equipment_code, equipment_name, category, model_number, serial_number,
    manufacturer, supplier, installation_date, installation_location,
    department, manager_name, status, calibration_cycle_months,
    last_calibration_date, next_calibration_due_date, pm_cycle_months,
    last_pm_date, next_pm_due_date, criticality, specifications, remarks,
    created_by, last_modified_by
) VALUES 
(
    'EQ-202610-001', '고성능 액체크로마토그래피 (HPLC)', 'MEASURING_INSTRUMENT',
    '1260 Infinity II', 'DEAGB01928', 'Agilent Technologies', '영인에이티',
    CURRENT_DATE - INTERVAL '365 day', '제1품질관리시험실 (HPLC실)', '품질관리팀',
    '김연구 책임', 'OPERATIONAL', 12,
    CURRENT_DATE - INTERVAL '60 day', CURRENT_DATE + INTERVAL '305 day', 6,
    CURRENT_DATE - INTERVAL '60 day', CURRENT_DATE + INTERVAL '120 day', 'HIGH',
    'Quaternary Pump, Vialsampler, Column Compartment, DAD WR Detector',
    '화장품 기능성 주성분 및 보존제 정량 분석용 중점관리 장비', 'admin', 'admin'
),
(
    'EQ-202610-002', '진공유화기 500L (제조1호기)', 'PRODUCTION_EQUIPMENT',
    'VE-500-SS', 'MFR-2024-0081', '한선엔지니어링', '한선엔지니어링',
    CURRENT_DATE - INTERVAL '500 day', '제조동 2층 유화실 (Grade D)', '생산팀',
    '박제조 과장', 'OPERATIONAL', 24,
    CURRENT_DATE - INTERVAL '180 day', CURRENT_DATE + INTERVAL '550 day', 3,
    CURRENT_DATE - INTERVAL '30 day', CURRENT_DATE + INTERVAL '60 day', 'HIGH',
    '용량 500L, SUS316L, 최고온도 95℃, 호모믹서 3600 RPM, 패들 스크래퍼',
    '크림/에센스 제형 메인 유화기', 'admin', 'admin'
),
(
    'EQ-202610-003', '공조시스템 AHU-01 (조제/충전구역)', 'UTILITY_FACILITY',
    'AHU-HVAC-3000', 'HVAC-2023-441', '신성이엔지', '신성이엔지',
    CURRENT_DATE - INTERVAL '700 day', '공조기계실 3층', '시설관리팀',
    '정시설 대리', 'OPERATIONAL', 12,
    CURRENT_DATE - INTERVAL '350 day', CURRENT_DATE + INTERVAL '15 day', 3,
    CURRENT_DATE - INTERVAL '70 day', CURRENT_DATE + INTERVAL '20 day', 'HIGH',
    '풍량 30,000 CMH, HEPA 필터 H14 99.995%, 차압 제어 25Pa',
    '청정실 Grade C/D 공조 공급 메인 AHU - 차기 교정 15일 이내 임박', 'admin', 'admin'
)
ON CONFLICT (equipment_code) DO NOTHING;

INSERT INTO calibration_records (
    calibration_number, equipment_id, calibration_date, agency_type,
    agency_name, certificate_number, certificate_file_url, result,
    tolerance_standard, max_deviation, calibrated_by, verified_by,
    verification_date, impact_assessment_required, impact_assessment_notes,
    next_calibration_due_date, remarks, created_by, last_modified_by
) VALUES 
(
    'CAL-202610-001', 1, CURRENT_DATE - INTERVAL '60 day', 'EXTERNAL_KOLAS',
    '한국표준과학연구원 (KRISS 인증원)', 'KOLAS-CAL-2026-08172', '/files/cal/HPLC_2026.pdf', 'PASS',
    '유속 정확도 ±1.0% 이내, 파장 오차 ±1.0nm 이내', '유속 오차 +0.12%, 파장 오차 +0.2nm',
    'KOLAS 김공인 기사', '품질보증팀 이영희', CURRENT_DATE - INTERVAL '58 day',
    false, NULL, CURRENT_DATE + INTERVAL '305 day', '전 항목 국가표준 소급성 만족 및 적합 판정',
    'admin', 'admin'
),
(
    'CAL-202610-002', 3, CURRENT_DATE - INTERVAL '350 day', 'EXTERNAL_KOLAS',
    '한국계량측정협회', 'KASTO-2025-9921', '/files/cal/AHU_Sensor_2025.pdf', 'PASS_WITH_CORRECTION',
    '풍량 및 차압센서 허용오차 ±2.5Pa 이내', '차압 오차 -1.8Pa (보정계수 1.02 적용)',
    'KASTO 박측정 평가사', '시설책임자 정시설', CURRENT_DATE - INTERVAL '348 day',
    false, '보정테이블 DDC 시스템에 반영 완료', CURRENT_DATE + INTERVAL '15 day', '조건부 적합 - 차기 주기 정기교정 요망',
    'admin', 'admin'
)
ON CONFLICT (calibration_number) DO NOTHING;

INSERT INTO maintenance_records (
    maintenance_number, equipment_id, maintenance_type, maintenance_date,
    performer, cost, maintenance_result, parts_replaced, downtime_hours,
    details, verified_by, next_pm_due_date, remarks, created_by, last_modified_by
) VALUES 
(
    'MNT-202610-001', 2, 'PREVENTIVE_PM', CURRENT_DATE - INTERVAL '30 day',
    '한선엔지니어링 기술지원팀', 850000.00, 'COMPLETED', '메카니컬 씰(Viton O-Ring), 테프론 블레이드', 4.0,
    '정기 분기 예방보전: 호모믹서 샤프트 정렬 점검, 메카니컬 씰 신품 교체, 진공 펌프 오일 교환 및 기밀도 테스트 정상.',
    '생산기술팀 박과장', CURRENT_DATE + INTERVAL '60 day', '정상 완료 후 무부하 시운전 이상 무',
    'admin', 'admin'
),
(
    'MNT-202610-002', 3, 'PREVENTIVE_PM', CURRENT_DATE - INTERVAL '70 day',
    '신성이엔지 유지보수반', 1200000.00, 'COMPLETED', '프리필터 12매, 미디움필터 6매', 2.5,
    '공조기 필터 차압 상승에 따른 1차/2차 필터 전면 교체 및 송풍기 벨트 장력 조정. HEPA 필터 차압 120Pa 정상 확인.',
    '시설관리팀 정대리', CURRENT_DATE + INTERVAL '20 day', '교체 후 차압 28Pa 안정화',
    'admin', 'admin'
)
ON CONFLICT (maintenance_number) DO NOTHING;

INSERT INTO environmental_monitorings (
    monitoring_number, area, monitoring_date, temperature, humidity,
    differential_pressure, airborneParticles05, airborneParticles50,
    microbial_count, status, inspector, corrective_action, remarks,
    created_by, last_modified_by
) VALUES 
(
    'ENV-202610-001', 'CLEANROOM_GRADE_C', CURRENT_TIMESTAMP - INTERVAL '1 day',
    21.5, 48.2, 26.5, 284000, 1850, 8, 'NORMAL',
    '품질환경원 최수민', NULL, 'Grade C 조제실 부유미립자 및 온습도 정상', 'admin', 'admin'
),
(
    'ENV-202610-002', 'CLEANROOM_GRADE_D', CURRENT_TIMESTAMP - INTERVAL '1 day',
    22.0, 51.0, 16.2, 1850000, 12400, 45, 'NORMAL',
    '품질환경원 최수민', NULL, 'Grade D 충전실 부유미립자 및 낙하균 기준치 이내 적합', 'admin', 'admin'
),
(
    'ENV-202610-003', 'WEIGHING_ROOM', CURRENT_TIMESTAMP - INTERVAL '2 hour',
    20.8, 44.5, -12.5, 420000, 2900, 15, 'NORMAL',
    '품질환경원 최수민', NULL, '원료 칭량실 음압(-12.5Pa) 정상 유지 (원료 분진 비산 방지)', 'admin', 'admin'
)
ON CONFLICT (monitoring_number) DO NOTHING;
