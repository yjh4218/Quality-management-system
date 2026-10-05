-- ============================================================================
-- V121: 시스템 표준 대메뉴 및 하위 메뉴 시딩 (ANSI SQL - H2 / PostgreSQL 교차 호환)
-- ============================================================================

-- 1. QMS 11대 표준 대메뉴 루트 등록
INSERT INTO dynamic_menu (parent_id, menu_name, menu_code, menu_order, icon, is_active)
SELECT NULL, '시스템 관리', 'SYSTEM_ROOT', 10, '🛠️', true
WHERE NOT EXISTS (SELECT 1 FROM dynamic_menu WHERE menu_code = 'SYSTEM_ROOT');

INSERT INTO dynamic_menu (parent_id, menu_name, menu_code, menu_order, icon, is_active)
SELECT NULL, '현황 모니터링', 'MONITORING_ROOT', 20, '📊', true
WHERE NOT EXISTS (SELECT 1 FROM dynamic_menu WHERE menu_code = 'MONITORING_ROOT');

INSERT INTO dynamic_menu (parent_id, menu_name, menu_code, menu_order, icon, is_active)
SELECT NULL, '전자결재', 'APPROVAL_ROOT', 30, '📋', true
WHERE NOT EXISTS (SELECT 1 FROM dynamic_menu WHERE menu_code = 'APPROVAL_ROOT');

INSERT INTO dynamic_menu (parent_id, menu_name, menu_code, menu_order, icon, is_active)
SELECT NULL, '품목 코드 관리', 'PRODUCTS_ROOT', 40, '🏷️', true
WHERE NOT EXISTS (SELECT 1 FROM dynamic_menu WHERE menu_code = 'PRODUCTS_ROOT');

INSERT INTO dynamic_menu (parent_id, menu_name, menu_code, menu_order, icon, is_active)
SELECT NULL, '제조사 관리', 'PARTNER_ROOT', 50, '🏭', true
WHERE NOT EXISTS (SELECT 1 FROM dynamic_menu WHERE menu_code = 'PARTNER_ROOT');

INSERT INTO dynamic_menu (parent_id, menu_name, menu_code, menu_order, icon, is_active)
SELECT NULL, 'Audit 센터', 'AUDIT_ROOT', 60, '🔍', true
WHERE NOT EXISTS (SELECT 1 FROM dynamic_menu WHERE menu_code = 'AUDIT_ROOT');

INSERT INTO dynamic_menu (parent_id, menu_name, menu_code, menu_order, icon, is_active)
SELECT NULL, '생산 및 품질 관리', 'QUALITY_ROOT', 70, '🛡️', true
WHERE NOT EXISTS (SELECT 1 FROM dynamic_menu WHERE menu_code = 'QUALITY_ROOT');

INSERT INTO dynamic_menu (parent_id, menu_name, menu_code, menu_order, icon, is_active)
SELECT NULL, '포장재 관리', 'PACKAGING_ROOT', 80, '📦', true
WHERE NOT EXISTS (SELECT 1 FROM dynamic_menu WHERE menu_code = 'PACKAGING_ROOT');

INSERT INTO dynamic_menu (parent_id, menu_name, menu_code, menu_order, icon, is_active)
SELECT NULL, '입고 및 품질 검사', 'INBOUND_ROOT', 90, '📥', true
WHERE NOT EXISTS (SELECT 1 FROM dynamic_menu WHERE menu_code = 'INBOUND_ROOT');

INSERT INTO dynamic_menu (parent_id, menu_name, menu_code, menu_order, icon, is_active)
SELECT NULL, 'CX 클레임 관리', 'CLAIM_ROOT', 100, '💔', true
WHERE NOT EXISTS (SELECT 1 FROM dynamic_menu WHERE menu_code = 'CLAIM_ROOT');

-- 2. 시스템 관리 하위 '화면 관리' 서브 메뉴 시딩
INSERT INTO dynamic_menu (parent_id, menu_name, menu_code, menu_order, icon, is_active)
SELECT p.id, '메뉴 관리', 'SYS_MENU_MANAGEMENT', 1, '📁', true
FROM dynamic_menu p
WHERE p.menu_code = 'SYSTEM_ROOT'
  AND NOT EXISTS (SELECT 1 FROM dynamic_menu WHERE menu_code = 'SYS_MENU_MANAGEMENT');

INSERT INTO dynamic_menu (parent_id, menu_name, menu_code, menu_order, icon, is_active)
SELECT p.id, '화면 위치 관리', 'SYS_SCREEN_POSITION', 2, '🧭', true
FROM dynamic_menu p
WHERE p.menu_code = 'SYSTEM_ROOT'
  AND NOT EXISTS (SELECT 1 FROM dynamic_menu WHERE menu_code = 'SYS_SCREEN_POSITION');

-- 3. 관리자 및 주요 역할에 권한 부여
INSERT INTO dynamic_menu_permission (menu_id, role_id, can_view, can_create, can_edit, can_delete)
SELECT m.id, r.id, true, true, true, true
FROM dynamic_menu m, roles r
WHERE r.role_key IN ('ROLE_ADMIN', 'ADMIN')
  AND NOT EXISTS (
    SELECT 1 FROM dynamic_menu_permission dmp 
    WHERE dmp.menu_id = m.id AND dmp.role_id = r.id
  );
