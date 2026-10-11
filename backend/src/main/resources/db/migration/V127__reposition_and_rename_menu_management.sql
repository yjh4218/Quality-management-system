-- ============================================================================
-- V127: 시스템 관리 내 '화면 및 메뉴 편집기' 명칭 보강 및 위치(순서) 정렬
-- 1. SYS_NOTI_SETTINGS (알림 설정 관리) 순서를 92로 변경하여 '설정 및 유지보수' 하위로 배치
-- 2. SYS_MENU_MANAGEMENT (화면 및 메뉴 편집기) 순서를 96으로 변경하여 '화면 관리' 구분선(95) 바로 아래로 배치
-- H2 / PostgreSQL 교차 호환 ANSI SQL 준수
-- ============================================================================

-- 1. 알림 설정 관리 순서 조정 (설정 및 유지보수 구분선 65 하위로 이동)
UPDATE dynamic_menu 
SET menu_order = 92 
WHERE menu_code = 'SYS_NOTI_SETTINGS';

-- 2. 화면 및 메뉴 관리 명칭 및 순서 조정 (화면 관리 구분선 95 하위로 이동)
UPDATE dynamic_menu 
SET menu_name = '화면 및 메뉴 편집기',
    menu_order = 96,
    icon = '📁'
WHERE menu_code = 'SYS_MENU_MANAGEMENT';

-- 3. 혹시 부모가 누락되었을 경우를 대비한 부모 SYSTEM_ROOT 정합성 보정
UPDATE dynamic_menu
SET parent_id = (SELECT id FROM dynamic_menu WHERE menu_code = 'SYSTEM_ROOT')
WHERE menu_code = 'SYS_MENU_MANAGEMENT'
  AND parent_id IS NULL;
