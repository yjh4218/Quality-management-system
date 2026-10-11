-- ============================================================================
-- V128: 시스템 관리 내 '화면 및 메뉴 관리' 명칭 최적화 및 '화면 관리' 구분선 하위 배치 확정
-- 1. SYS_MENU_MANAGEMENT 명칭을 사용자가 직관적으로 '화면 관리'로 인지할 수 있는 '화면 및 메뉴 관리'로 보강
-- 2. 순서 menu_order = 96 유지 ('화면 관리' 구분선 DIV_SYS_SCREEN order 95 바로 아래)
-- H2 / PostgreSQL 교차 호환 ANSI SQL 준수
-- ============================================================================

UPDATE dynamic_menu 
SET menu_name = '화면 및 메뉴 관리',
    menu_order = 96,
    icon = '📁'
WHERE menu_code = 'SYS_MENU_MANAGEMENT';

-- 혹시 SYS_SCREEN_MANAGEMENT 코드로 존재하는 레코드가 있을 경우 동기화
UPDATE dynamic_menu 
SET menu_name = '화면 및 메뉴 관리',
    menu_order = 96,
    icon = '📁'
WHERE menu_code = 'SYS_SCREEN_MANAGEMENT';
