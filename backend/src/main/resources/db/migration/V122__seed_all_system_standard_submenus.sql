-- ============================================================================
-- V122: 시스템 표준 서브메뉴 전체 시딩 및 메뉴 타입 컬럼 추가 (ANSI SQL - H2 / PostgreSQL 교차 호환)
-- ============================================================================

-- 1. dynamic_menu 테이블에 menu_type 컬럼 추가 (기본값 'DYNAMIC')
ALTER TABLE dynamic_menu ADD COLUMN IF NOT EXISTS menu_type VARCHAR(20) DEFAULT 'DYNAMIC';

-- 2. 기존 대메뉴 루트 및 메뉴 관리 메뉴 SYSTEM 타입 지정
UPDATE dynamic_menu SET menu_type = 'SYSTEM' WHERE screen_id IS NULL AND menu_code LIKE '%_ROOT';
UPDATE dynamic_menu SET menu_type = 'SYSTEM' WHERE menu_code = 'SYS_MENU_MANAGEMENT';

-- 3. 화면 위치 관리 메뉴 비활성화
UPDATE dynamic_menu SET is_active = false WHERE menu_code = 'SYS_SCREEN_POSITION';

-- ============================================================================
-- 4. 10대 카테고리 하위 35개 시스템 표준 서브메뉴 일괄 등록
-- ============================================================================

-- [1] 현황 모니터링 (MONITORING_ROOT)
INSERT INTO dynamic_menu (parent_id, menu_name, menu_code, menu_order, icon, is_active, menu_type)
SELECT p.id, '시스템 대시보드', 'SYS_DASHBOARD', 10, '📊', true, 'SYSTEM'
FROM dynamic_menu p WHERE p.menu_code = 'MONITORING_ROOT'
  AND NOT EXISTS (SELECT 1 FROM dynamic_menu WHERE menu_code = 'SYS_DASHBOARD');

INSERT INTO dynamic_menu (parent_id, menu_name, menu_code, menu_order, icon, is_active, menu_type)
SELECT p.id, '전체공지', 'SYS_ANNOUNCEMENTS', 20, '📢', true, 'SYSTEM'
FROM dynamic_menu p WHERE p.menu_code = 'MONITORING_ROOT'
  AND NOT EXISTS (SELECT 1 FROM dynamic_menu WHERE menu_code = 'SYS_ANNOUNCEMENTS');

INSERT INTO dynamic_menu (parent_id, menu_name, menu_code, menu_order, icon, is_active, menu_type)
SELECT p.id, '수신 알림 확인', 'SYS_NOTIFICATIONS', 30, '🔔', true, 'SYSTEM'
FROM dynamic_menu p WHERE p.menu_code = 'MONITORING_ROOT'
  AND NOT EXISTS (SELECT 1 FROM dynamic_menu WHERE menu_code = 'SYS_NOTIFICATIONS');

-- [2] 전자결재 (APPROVAL_ROOT)
INSERT INTO dynamic_menu (parent_id, menu_name, menu_code, menu_order, icon, is_active, menu_type)
SELECT p.id, '결재 대기함', 'SYS_APPROVAL_PENDING', 10, '⏳', true, 'SYSTEM'
FROM dynamic_menu p WHERE p.menu_code = 'APPROVAL_ROOT'
  AND NOT EXISTS (SELECT 1 FROM dynamic_menu WHERE menu_code = 'SYS_APPROVAL_PENDING');

INSERT INTO dynamic_menu (parent_id, menu_name, menu_code, menu_order, icon, is_active, menu_type)
SELECT p.id, '기안 문서함', 'SYS_APPROVAL_SUBMITTED', 20, '📤', true, 'SYSTEM'
FROM dynamic_menu p WHERE p.menu_code = 'APPROVAL_ROOT'
  AND NOT EXISTS (SELECT 1 FROM dynamic_menu WHERE menu_code = 'SYS_APPROVAL_SUBMITTED');

INSERT INTO dynamic_menu (parent_id, menu_name, menu_code, menu_order, icon, is_active, menu_type)
SELECT p.id, '진행 중 문서', 'SYS_APPROVAL_IN_PROGRESS', 30, '🔄', true, 'SYSTEM'
FROM dynamic_menu p WHERE p.menu_code = 'APPROVAL_ROOT'
  AND NOT EXISTS (SELECT 1 FROM dynamic_menu WHERE menu_code = 'SYS_APPROVAL_IN_PROGRESS');

INSERT INTO dynamic_menu (parent_id, menu_name, menu_code, menu_order, icon, is_active, menu_type)
SELECT p.id, '결재 완료함', 'SYS_APPROVAL_COMPLETED', 40, '✅', true, 'SYSTEM'
FROM dynamic_menu p WHERE p.menu_code = 'APPROVAL_ROOT'
  AND NOT EXISTS (SELECT 1 FROM dynamic_menu WHERE menu_code = 'SYS_APPROVAL_COMPLETED');

INSERT INTO dynamic_menu (parent_id, menu_name, menu_code, menu_order, icon, is_active, menu_type)
SELECT p.id, '반려 문서함', 'SYS_APPROVAL_REJECTED', 50, '❌', true, 'SYSTEM'
FROM dynamic_menu p WHERE p.menu_code = 'APPROVAL_ROOT'
  AND NOT EXISTS (SELECT 1 FROM dynamic_menu WHERE menu_code = 'SYS_APPROVAL_REJECTED');

INSERT INTO dynamic_menu (parent_id, menu_name, menu_code, menu_order, icon, is_active, menu_type)
SELECT p.id, '참조 문서함', 'SYS_APPROVAL_REFERENCE', 60, '👀', true, 'SYSTEM'
FROM dynamic_menu p WHERE p.menu_code = 'APPROVAL_ROOT'
  AND NOT EXISTS (SELECT 1 FROM dynamic_menu WHERE menu_code = 'SYS_APPROVAL_REFERENCE');

INSERT INTO dynamic_menu (parent_id, menu_name, menu_code, menu_order, icon, is_active, menu_type)
SELECT p.id, '내 결재 내역', 'SYS_APPROVAL_HISTORY', 70, '📜', true, 'SYSTEM'
FROM dynamic_menu p WHERE p.menu_code = 'APPROVAL_ROOT'
  AND NOT EXISTS (SELECT 1 FROM dynamic_menu WHERE menu_code = 'SYS_APPROVAL_HISTORY');

INSERT INTO dynamic_menu (parent_id, menu_name, menu_code, menu_order, icon, is_active, menu_type)
SELECT p.id, '결재 문서유형 관리', 'SYS_APPROVAL_DOC_TYPES', 80, '📑', true, 'SYSTEM'
FROM dynamic_menu p WHERE p.menu_code = 'APPROVAL_ROOT'
  AND NOT EXISTS (SELECT 1 FROM dynamic_menu WHERE menu_code = 'SYS_APPROVAL_DOC_TYPES');

INSERT INTO dynamic_menu (parent_id, menu_name, menu_code, menu_order, icon, is_active, menu_type)
SELECT p.id, '결재선 템플릿 빌더', 'SYS_APPROVAL_TEMPLATES', 90, '📐', true, 'SYSTEM'
FROM dynamic_menu p WHERE p.menu_code = 'APPROVAL_ROOT'
  AND NOT EXISTS (SELECT 1 FROM dynamic_menu WHERE menu_code = 'SYS_APPROVAL_TEMPLATES');

INSERT INTO dynamic_menu (parent_id, menu_name, menu_code, menu_order, icon, is_active, menu_type)
SELECT p.id, '결재 알림 설정', 'SYS_APPROVAL_NOTI_RULES', 100, '🔔', true, 'SYSTEM'
FROM dynamic_menu p WHERE p.menu_code = 'APPROVAL_ROOT'
  AND NOT EXISTS (SELECT 1 FROM dynamic_menu WHERE menu_code = 'SYS_APPROVAL_NOTI_RULES');

-- [3] 시스템 관리 (SYSTEM_ROOT)
INSERT INTO dynamic_menu (parent_id, menu_name, menu_code, menu_order, icon, is_active, menu_type)
SELECT p.id, '사용자 승인 관리', 'SYS_USERS', 10, '👥', true, 'SYSTEM'
FROM dynamic_menu p WHERE p.menu_code = 'SYSTEM_ROOT'
  AND NOT EXISTS (SELECT 1 FROM dynamic_menu WHERE menu_code = 'SYS_USERS');

INSERT INTO dynamic_menu (parent_id, menu_name, menu_code, menu_order, icon, is_active, menu_type)
SELECT p.id, '권한 관리', 'SYS_ROLES', 20, '🔐', true, 'SYSTEM'
FROM dynamic_menu p WHERE p.menu_code = 'SYSTEM_ROOT'
  AND NOT EXISTS (SELECT 1 FROM dynamic_menu WHERE menu_code = 'SYS_ROLES');

INSERT INTO dynamic_menu (parent_id, menu_name, menu_code, menu_order, icon, is_active, menu_type)
SELECT p.id, '사용자 접근 로그', 'SYS_ACCESS_LOGS', 30, '🕒', true, 'SYSTEM'
FROM dynamic_menu p WHERE p.menu_code = 'SYSTEM_ROOT'
  AND NOT EXISTS (SELECT 1 FROM dynamic_menu WHERE menu_code = 'SYS_ACCESS_LOGS');

INSERT INTO dynamic_menu (parent_id, menu_name, menu_code, menu_order, icon, is_active, menu_type)
SELECT p.id, '시스템 변경 이력', 'SYS_LOGS', 40, '📜', true, 'SYSTEM'
FROM dynamic_menu p WHERE p.menu_code = 'SYSTEM_ROOT'
  AND NOT EXISTS (SELECT 1 FROM dynamic_menu WHERE menu_code = 'SYS_LOGS');

INSERT INTO dynamic_menu (parent_id, menu_name, menu_code, menu_order, icon, is_active, menu_type)
SELECT p.id, '버그 리포트 관리', 'SYS_BUG_REPORTS', 50, '🐞', true, 'SYSTEM'
FROM dynamic_menu p WHERE p.menu_code = 'SYSTEM_ROOT'
  AND NOT EXISTS (SELECT 1 FROM dynamic_menu WHERE menu_code = 'SYS_BUG_REPORTS');

INSERT INTO dynamic_menu (parent_id, menu_name, menu_code, menu_order, icon, is_active, menu_type)
SELECT p.id, '가이드 관리', 'SYS_GUIDE_MGMT', 60, '📖', true, 'SYSTEM'
FROM dynamic_menu p WHERE p.menu_code = 'SYSTEM_ROOT'
  AND NOT EXISTS (SELECT 1 FROM dynamic_menu WHERE menu_code = 'SYS_GUIDE_MGMT');

INSERT INTO dynamic_menu (parent_id, menu_name, menu_code, menu_order, icon, is_active, menu_type)
SELECT p.id, '대시보드 제작/관리', 'SYS_DASHBOARD_MGMT', 70, '🎨', true, 'SYSTEM'
FROM dynamic_menu p WHERE p.menu_code = 'SYSTEM_ROOT'
  AND NOT EXISTS (SELECT 1 FROM dynamic_menu WHERE menu_code = 'SYS_DASHBOARD_MGMT');

INSERT INTO dynamic_menu (parent_id, menu_name, menu_code, menu_order, icon, is_active, menu_type)
SELECT p.id, '데이터 복구 (휴지통)', 'SYS_TRASH_BIN', 80, '🗑️', true, 'SYSTEM'
FROM dynamic_menu p WHERE p.menu_code = 'SYSTEM_ROOT'
  AND NOT EXISTS (SELECT 1 FROM dynamic_menu WHERE menu_code = 'SYS_TRASH_BIN');

INSERT INTO dynamic_menu (parent_id, menu_name, menu_code, menu_order, icon, is_active, menu_type)
SELECT p.id, '제조사 전달 메일 관리', 'SYS_MAIL_TEMPLATES', 90, '📧', true, 'SYSTEM'
FROM dynamic_menu p WHERE p.menu_code = 'SYSTEM_ROOT'
  AND NOT EXISTS (SELECT 1 FROM dynamic_menu WHERE menu_code = 'SYS_MAIL_TEMPLATES');

INSERT INTO dynamic_menu (parent_id, menu_name, menu_code, menu_order, icon, is_active, menu_type)
SELECT p.id, '알림 설정 관리', 'SYS_NOTI_SETTINGS', 100, '🔔', true, 'SYSTEM'
FROM dynamic_menu p WHERE p.menu_code = 'SYSTEM_ROOT'
  AND NOT EXISTS (SELECT 1 FROM dynamic_menu WHERE menu_code = 'SYS_NOTI_SETTINGS');

-- [4] 품목 코드 관리 (PRODUCTS_ROOT)
INSERT INTO dynamic_menu (parent_id, menu_name, menu_code, menu_order, icon, is_active, menu_type)
SELECT p.id, '제품코드 마스터', 'SYS_PRODUCTS', 10, '📦', true, 'SYSTEM'
FROM dynamic_menu p WHERE p.menu_code = 'PRODUCTS_ROOT'
  AND NOT EXISTS (SELECT 1 FROM dynamic_menu WHERE menu_code = 'SYS_PRODUCTS');

INSERT INTO dynamic_menu (parent_id, menu_name, menu_code, menu_order, icon, is_active, menu_type)
SELECT p.id, '제품코드 대시보드', 'SYS_PRODUCT_DASHBOARD', 20, '📊', true, 'SYSTEM'
FROM dynamic_menu p WHERE p.menu_code = 'PRODUCTS_ROOT'
  AND NOT EXISTS (SELECT 1 FROM dynamic_menu WHERE menu_code = 'SYS_PRODUCT_DASHBOARD');

INSERT INTO dynamic_menu (parent_id, menu_name, menu_code, menu_order, icon, is_active, menu_type)
SELECT p.id, '브랜드 마스터 관리', 'SYS_BRANDS', 30, '🏷️', true, 'SYSTEM'
FROM dynamic_menu p WHERE p.menu_code = 'PRODUCTS_ROOT'
  AND NOT EXISTS (SELECT 1 FROM dynamic_menu WHERE menu_code = 'SYS_BRANDS');

INSERT INTO dynamic_menu (parent_id, menu_name, menu_code, menu_order, icon, is_active, menu_type)
SELECT p.id, '유통 채널 관리', 'SYS_SALES_CHANNELS', 40, '🌐', true, 'SYSTEM'
FROM dynamic_menu p WHERE p.menu_code = 'PRODUCTS_ROOT'
  AND NOT EXISTS (SELECT 1 FROM dynamic_menu WHERE menu_code = 'SYS_SALES_CHANNELS');

INSERT INTO dynamic_menu (parent_id, menu_name, menu_code, menu_order, icon, is_active, menu_type)
SELECT p.id, '성분 안전성 검토 (Global Compliance)', 'SYS_INGREDIENT_COMPLIANCE', 50, '🧪', true, 'SYSTEM'
FROM dynamic_menu p WHERE p.menu_code = 'PRODUCTS_ROOT'
  AND NOT EXISTS (SELECT 1 FROM dynamic_menu WHERE menu_code = 'SYS_INGREDIENT_COMPLIANCE');

INSERT INTO dynamic_menu (parent_id, menu_name, menu_code, menu_order, icon, is_active, menu_type)
SELECT p.id, '구성품 BOM 마스터 관리', 'SYS_BOM_MASTER', 60, '📏', true, 'SYSTEM'
FROM dynamic_menu p WHERE p.menu_code = 'PRODUCTS_ROOT'
  AND NOT EXISTS (SELECT 1 FROM dynamic_menu WHERE menu_code = 'SYS_BOM_MASTER');

INSERT INTO dynamic_menu (parent_id, menu_name, menu_code, menu_order, icon, is_active, menu_type)
SELECT p.id, 'BOM 유형 설정/관리', 'SYS_BOM_CATEGORIES', 70, '⚙️', true, 'SYSTEM'
FROM dynamic_menu p WHERE p.menu_code = 'PRODUCTS_ROOT'
  AND NOT EXISTS (SELECT 1 FROM dynamic_menu WHERE menu_code = 'SYS_BOM_CATEGORIES');

-- [5] 제조사 관리 (PARTNER_ROOT)
INSERT INTO dynamic_menu (parent_id, menu_name, menu_code, menu_order, icon, is_active, menu_type)
SELECT p.id, '제조사 정보 관리', 'SYS_MANUFACTURERS', 10, '🏭', true, 'SYSTEM'
FROM dynamic_menu p WHERE p.menu_code = 'PARTNER_ROOT'
  AND NOT EXISTS (SELECT 1 FROM dynamic_menu WHERE menu_code = 'SYS_MANUFACTURERS');

INSERT INTO dynamic_menu (parent_id, menu_name, menu_code, menu_order, icon, is_active, menu_type)
SELECT p.id, '제조사 구분 관리', 'SYS_MANUFACTURER_CATEGORIES', 20, '📂', true, 'SYSTEM'
FROM dynamic_menu p WHERE p.menu_code = 'PARTNER_ROOT'
  AND NOT EXISTS (SELECT 1 FROM dynamic_menu WHERE menu_code = 'SYS_MANUFACTURER_CATEGORIES');

INSERT INTO dynamic_menu (parent_id, menu_name, menu_code, menu_order, icon, is_active, menu_type)
SELECT p.id, '제조사 협업 가이드', 'SYS_MANUFACTURER_GUIDE', 30, '🤝', true, 'SYSTEM'
FROM dynamic_menu p WHERE p.menu_code = 'PARTNER_ROOT'
  AND NOT EXISTS (SELECT 1 FROM dynamic_menu WHERE menu_code = 'SYS_MANUFACTURER_GUIDE');

-- [6] Audit 센터 (AUDIT_ROOT)
INSERT INTO dynamic_menu (parent_id, menu_name, menu_code, menu_order, icon, is_active, menu_type)
SELECT p.id, '제조사 Audit 관리', 'SYS_MANUFACTURER_AUDITS', 10, '📝', true, 'SYSTEM'
FROM dynamic_menu p WHERE p.menu_code = 'AUDIT_ROOT'
  AND NOT EXISTS (SELECT 1 FROM dynamic_menu WHERE menu_code = 'SYS_MANUFACTURER_AUDITS');

INSERT INTO dynamic_menu (parent_id, menu_name, menu_code, menu_order, icon, is_active, menu_type)
SELECT p.id, '제조사 Audit 대시보드', 'SYS_MANUFACTURER_AUDIT_DASHBOARD', 20, '📊', true, 'SYSTEM'
FROM dynamic_menu p WHERE p.menu_code = 'AUDIT_ROOT'
  AND NOT EXISTS (SELECT 1 FROM dynamic_menu WHERE menu_code = 'SYS_MANUFACTURER_AUDIT_DASHBOARD');

INSERT INTO dynamic_menu (parent_id, menu_name, menu_code, menu_order, icon, is_active, menu_type)
SELECT p.id, '제조사 점검항목 관리', 'SYS_MANUFACTURER_AUDIT_ITEMS', 30, '📋', true, 'SYSTEM'
FROM dynamic_menu p WHERE p.menu_code = 'AUDIT_ROOT'
  AND NOT EXISTS (SELECT 1 FROM dynamic_menu WHERE menu_code = 'SYS_MANUFACTURER_AUDIT_ITEMS');

-- [7] 생산 및 품질 관리 (QUALITY_ROOT)
INSERT INTO dynamic_menu (parent_id, menu_name, menu_code, menu_order, icon, is_active, menu_type)
SELECT p.id, '신제품 생산감리 (사진감리)', 'SYS_QUALITY_PHOTO_AUDIT', 10, '📸', true, 'SYSTEM'
FROM dynamic_menu p WHERE p.menu_code = 'QUALITY_ROOT'
  AND NOT EXISTS (SELECT 1 FROM dynamic_menu WHERE menu_code = 'SYS_QUALITY_PHOTO_AUDIT');

INSERT INTO dynamic_menu (parent_id, menu_name, menu_code, menu_order, icon, is_active, menu_type)
SELECT p.id, '생산감리 대시보드', 'SYS_PRODUCTION_AUDIT_DASHBOARD', 20, '📊', true, 'SYSTEM'
FROM dynamic_menu p WHERE p.menu_code = 'QUALITY_ROOT'
  AND NOT EXISTS (SELECT 1 FROM dynamic_menu WHERE menu_code = 'SYS_PRODUCTION_AUDIT_DASHBOARD');

INSERT INTO dynamic_menu (parent_id, menu_name, menu_code, menu_order, icon, is_active, menu_type)
SELECT p.id, '필수 품질서류 관리', 'SYS_DOCUMENT_REQUESTS', 30, '📋', true, 'SYSTEM'
FROM dynamic_menu p WHERE p.menu_code = 'QUALITY_ROOT'
  AND NOT EXISTS (SELECT 1 FROM dynamic_menu WHERE menu_code = 'SYS_DOCUMENT_REQUESTS');

-- [8] 포장재 관리 (PACKAGING_ROOT)
INSERT INTO dynamic_menu (parent_id, menu_name, menu_code, menu_order, icon, is_active, menu_type)
SELECT p.id, '포장공정 템플릿 관리', 'SYS_PACKAGING_TEMPLATES', 10, '📋', true, 'SYSTEM'
FROM dynamic_menu p WHERE p.menu_code = 'PACKAGING_ROOT'
  AND NOT EXISTS (SELECT 1 FROM dynamic_menu WHERE menu_code = 'SYS_PACKAGING_TEMPLATES');

INSERT INTO dynamic_menu (parent_id, menu_name, menu_code, menu_order, icon, is_active, menu_type)
SELECT p.id, '포장공간비율 계산기', 'SYS_SPACE_RATIO_CALCULATOR', 20, '📐', true, 'SYSTEM'
FROM dynamic_menu p WHERE p.menu_code = 'PACKAGING_ROOT'
  AND NOT EXISTS (SELECT 1 FROM dynamic_menu WHERE menu_code = 'SYS_SPACE_RATIO_CALCULATOR');

INSERT INTO dynamic_menu (parent_id, menu_name, menu_code, menu_order, icon, is_active, menu_type)
SELECT p.id, '아웃박스 규격 계산기', 'SYS_OUTBOX_CALCULATOR', 30, '📦', true, 'SYSTEM'
FROM dynamic_menu p WHERE p.menu_code = 'PACKAGING_ROOT'
  AND NOT EXISTS (SELECT 1 FROM dynamic_menu WHERE menu_code = 'SYS_OUTBOX_CALCULATOR');

-- [9] 입고 및 품질 검사 (INBOUND_ROOT)
INSERT INTO dynamic_menu (parent_id, menu_name, menu_code, menu_order, icon, is_active, menu_type)
SELECT p.id, '입고 품질 검사 대시보드', 'SYS_QUALITY_DASHBOARD', 10, '🚚', true, 'SYSTEM'
FROM dynamic_menu p WHERE p.menu_code = 'INBOUND_ROOT'
  AND NOT EXISTS (SELECT 1 FROM dynamic_menu WHERE menu_code = 'SYS_QUALITY_DASHBOARD');

INSERT INTO dynamic_menu (parent_id, menu_name, menu_code, menu_order, icon, is_active, menu_type)
SELECT p.id, '입고 품질 관리', 'SYS_QUALITY', 20, '📦', true, 'SYSTEM'
FROM dynamic_menu p WHERE p.menu_code = 'INBOUND_ROOT'
  AND NOT EXISTS (SELECT 1 FROM dynamic_menu WHERE menu_code = 'SYS_QUALITY');

INSERT INTO dynamic_menu (parent_id, menu_name, menu_code, menu_order, icon, is_active, menu_type)
SELECT p.id, '시장출하 적부판정 기록', 'SYS_RELEASE_RECORD', 30, '📄', true, 'SYSTEM'
FROM dynamic_menu p WHERE p.menu_code = 'INBOUND_ROOT'
  AND NOT EXISTS (SELECT 1 FROM dynamic_menu WHERE menu_code = 'SYS_RELEASE_RECORD');

-- [10] CX 클레임 관리 (CLAIM_ROOT)
INSERT INTO dynamic_menu (parent_id, menu_name, menu_code, menu_order, icon, is_active, menu_type)
SELECT p.id, '클레임 조회 및 입력', 'SYS_CLAIMS', 10, '🔍', true, 'SYSTEM'
FROM dynamic_menu p WHERE p.menu_code = 'CLAIM_ROOT'
  AND NOT EXISTS (SELECT 1 FROM dynamic_menu WHERE menu_code = 'SYS_CLAIMS');

INSERT INTO dynamic_menu (parent_id, menu_name, menu_code, menu_order, icon, is_active, menu_type)
SELECT p.id, '클레임 대시보드', 'SYS_CLAIM_DASHBOARD', 20, '📈', true, 'SYSTEM'
FROM dynamic_menu p WHERE p.menu_code = 'CLAIM_ROOT'
  AND NOT EXISTS (SELECT 1 FROM dynamic_menu WHERE menu_code = 'SYS_CLAIM_DASHBOARD');

INSERT INTO dynamic_menu (parent_id, menu_name, menu_code, menu_order, icon, is_active, menu_type)
SELECT p.id, 'LOT PPM 분석 & 근본원인', 'SYS_LOT_PPM_DASHBOARD', 30, '📉', true, 'SYSTEM'
FROM dynamic_menu p WHERE p.menu_code = 'CLAIM_ROOT'
  AND NOT EXISTS (SELECT 1 FROM dynamic_menu WHERE menu_code = 'SYS_LOT_PPM_DASHBOARD');

-- ============================================================================
-- 5. 관리자 역할(ROLE_ADMIN, ADMIN)에 신규 메뉴 권한 일괄 부여
-- ============================================================================
INSERT INTO dynamic_menu_permission (menu_id, role_id, can_view, can_create, can_edit, can_delete)
SELECT m.id, r.id, true, true, true, true
FROM dynamic_menu m, roles r
WHERE r.role_key IN ('ROLE_ADMIN', 'ADMIN')
  AND NOT EXISTS (
    SELECT 1 FROM dynamic_menu_permission dmp 
    WHERE dmp.menu_id = m.id AND dmp.role_id = r.id
  );
