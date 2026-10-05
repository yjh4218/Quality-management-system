-- ============================================================================
-- V123: 기존 하드코딩 서브헤더 메뉴 구분선(DIVIDER) DB 시딩 (ANSI SQL - H2 / PostgreSQL 호환)
-- ============================================================================

-- [1] 품목코드 관리 (PRODUCTS_ROOT) 구분선
INSERT INTO dynamic_menu (parent_id, menu_name, menu_code, menu_order, icon, is_active, menu_type)
SELECT p.id, '기본 마스터', 'DIV_PROD_MASTER', 1, '➖', true, 'DIVIDER'
FROM dynamic_menu p WHERE p.menu_code = 'PRODUCTS_ROOT'
  AND NOT EXISTS (SELECT 1 FROM dynamic_menu WHERE menu_code = 'DIV_PROD_MASTER');

INSERT INTO dynamic_menu (parent_id, menu_name, menu_code, menu_order, icon, is_active, menu_type)
SELECT p.id, 'BOM/구성품 관리', 'DIV_PROD_BOM', 55, '➖', true, 'DIVIDER'
FROM dynamic_menu p WHERE p.menu_code = 'PRODUCTS_ROOT'
  AND NOT EXISTS (SELECT 1 FROM dynamic_menu WHERE menu_code = 'DIV_PROD_BOM');

-- [2] 전자결재 (APPROVAL_ROOT) 구분선
INSERT INTO dynamic_menu (parent_id, menu_name, menu_code, menu_order, icon, is_active, menu_type)
SELECT p.id, '개인 결재함', 'DIV_APPR_PERSONAL', 1, '➖', true, 'DIVIDER'
FROM dynamic_menu p WHERE p.menu_code = 'APPROVAL_ROOT'
  AND NOT EXISTS (SELECT 1 FROM dynamic_menu WHERE menu_code = 'DIV_APPR_PERSONAL');

INSERT INTO dynamic_menu (parent_id, menu_name, menu_code, menu_order, icon, is_active, menu_type)
SELECT p.id, '결재선 마스터 설정', 'DIV_APPR_CONFIG', 75, '➖', true, 'DIVIDER'
FROM dynamic_menu p WHERE p.menu_code = 'APPROVAL_ROOT'
  AND NOT EXISTS (SELECT 1 FROM dynamic_menu WHERE menu_code = 'DIV_APPR_CONFIG');

-- [3] 시스템 관리 (SYSTEM_ROOT) 구분선
INSERT INTO dynamic_menu (parent_id, menu_name, menu_code, menu_order, icon, is_active, menu_type)
SELECT p.id, '사용자 및 보안', 'DIV_SYS_SECURITY', 1, '➖', true, 'DIVIDER'
FROM dynamic_menu p WHERE p.menu_code = 'SYSTEM_ROOT'
  AND NOT EXISTS (SELECT 1 FROM dynamic_menu WHERE menu_code = 'DIV_SYS_SECURITY');

INSERT INTO dynamic_menu (parent_id, menu_name, menu_code, menu_order, icon, is_active, menu_type)
SELECT p.id, '운영 모니터링', 'DIV_SYS_OPS', 35, '➖', true, 'DIVIDER'
FROM dynamic_menu p WHERE p.menu_code = 'SYSTEM_ROOT'
  AND NOT EXISTS (SELECT 1 FROM dynamic_menu WHERE menu_code = 'DIV_SYS_OPS');

INSERT INTO dynamic_menu (parent_id, menu_name, menu_code, menu_order, icon, is_active, menu_type)
SELECT p.id, '설정 및 유지보수', 'DIV_SYS_MAINT', 65, '➖', true, 'DIVIDER'
FROM dynamic_menu p WHERE p.menu_code = 'SYSTEM_ROOT'
  AND NOT EXISTS (SELECT 1 FROM dynamic_menu WHERE menu_code = 'DIV_SYS_MAINT');

INSERT INTO dynamic_menu (parent_id, menu_name, menu_code, menu_order, icon, is_active, menu_type)
SELECT p.id, '화면 관리', 'DIV_SYS_SCREEN', 95, '➖', true, 'DIVIDER'
FROM dynamic_menu p WHERE p.menu_code = 'SYSTEM_ROOT'
  AND NOT EXISTS (SELECT 1 FROM dynamic_menu WHERE menu_code = 'DIV_SYS_SCREEN');

-- [4] CX 클레임 관리 (CLAIM_ROOT) 구분선
INSERT INTO dynamic_menu (parent_id, menu_name, menu_code, menu_order, icon, is_active, menu_type)
SELECT p.id, '클레임 운영', 'DIV_CLAIM_OPS', 1, '➖', true, 'DIVIDER'
FROM dynamic_menu p WHERE p.menu_code = 'CLAIM_ROOT'
  AND NOT EXISTS (SELECT 1 FROM dynamic_menu WHERE menu_code = 'DIV_CLAIM_OPS');

-- [5] 동적 화면 관리 (DYNAMIC_ROOT) 구분선
INSERT INTO dynamic_menu (parent_id, menu_name, menu_code, menu_order, icon, is_active, menu_type)
SELECT p.id, '동적 메타 관리', 'DIV_DYNAMIC_META', 1, '➖', true, 'DIVIDER'
FROM dynamic_menu p WHERE p.menu_code = 'DYNAMIC_ROOT'
  AND NOT EXISTS (SELECT 1 FROM dynamic_menu WHERE menu_code = 'DIV_DYNAMIC_META');
