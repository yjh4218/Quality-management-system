-- ============================================================================
-- V120: 클레임 다이나믹 분석 뷰 (SCR_DYNAMIC_CLAIM) 그리드 컬럼 및 검색 필드 시드
-- H2 / PostgreSQL 교차 호환 ANSI SQL 준수
-- ============================================================================

-- 1. SCR_DYNAMIC_CLAIM 검색 조건 매핑
INSERT INTO screen_search_field (screen_id, catalog_id, display_order)
SELECT s.id, c.id, 1
FROM dynamic_screen s, search_field_catalog c
WHERE s.screen_code = 'SCR_DYNAMIC_CLAIM' AND c.catalog_key = 'TEXT_SEARCH'
  AND NOT EXISTS (
    SELECT 1 FROM screen_search_field ssf 
    WHERE ssf.screen_id = s.id AND ssf.catalog_id = c.id
  );

INSERT INTO screen_search_field (screen_id, catalog_id, display_order)
SELECT s.id, c.id, 2
FROM dynamic_screen s, search_field_catalog c
WHERE s.screen_code = 'SCR_DYNAMIC_CLAIM' AND c.catalog_key = 'DATE_RANGE'
  AND NOT EXISTS (
    SELECT 1 FROM screen_search_field ssf 
    WHERE ssf.screen_id = s.id AND ssf.catalog_id = c.id
  );

INSERT INTO screen_search_field (screen_id, catalog_id, display_order)
SELECT s.id, c.id, 3
FROM dynamic_screen s, search_field_catalog c
WHERE s.screen_code = 'SCR_DYNAMIC_CLAIM' AND c.catalog_key = 'STATUS'
  AND NOT EXISTS (
    SELECT 1 FROM screen_search_field ssf 
    WHERE ssf.screen_id = s.id AND ssf.catalog_id = c.id
  );

-- 2. SCR_DYNAMIC_CLAIM 그리드 컬럼 매핑 (차원 및 측정치)
INSERT INTO screen_grid_column (screen_id, field_key, label, field_type, width, sortable, editable, display_order, is_measure, is_dimension)
SELECT s.id, 'claimNumber', '클레임 번호', 'TEXT', 150, true, false, 1, false, true
FROM dynamic_screen s WHERE s.screen_code = 'SCR_DYNAMIC_CLAIM'
  AND NOT EXISTS (SELECT 1 FROM screen_grid_column WHERE screen_id = s.id AND field_key = 'claimNumber');

INSERT INTO screen_grid_column (screen_id, field_key, label, field_type, width, sortable, editable, display_order, is_measure, is_dimension)
SELECT s.id, 'claimType', '클레임 유형', 'TEXT', 130, true, true, 2, false, true
FROM dynamic_screen s WHERE s.screen_code = 'SCR_DYNAMIC_CLAIM'
  AND NOT EXISTS (SELECT 1 FROM screen_grid_column WHERE screen_id = s.id AND field_key = 'claimType');

INSERT INTO screen_grid_column (screen_id, field_key, label, field_type, width, sortable, editable, display_order, is_measure, is_dimension)
SELECT s.id, 'receiptDate', '접수일자', 'DATE', 130, true, true, 3, false, true
FROM dynamic_screen s WHERE s.screen_code = 'SCR_DYNAMIC_CLAIM'
  AND NOT EXISTS (SELECT 1 FROM screen_grid_column WHERE screen_id = s.id AND field_key = 'receiptDate');

INSERT INTO screen_grid_column (screen_id, field_key, label, field_type, width, sortable, editable, display_order, is_measure, is_dimension)
SELECT s.id, 'defectQuantity', '불량 수량', 'NUMBER', 120, true, true, 4, true, false
FROM dynamic_screen s WHERE s.screen_code = 'SCR_DYNAMIC_CLAIM'
  AND NOT EXISTS (SELECT 1 FROM screen_grid_column WHERE screen_id = s.id AND field_key = 'defectQuantity');

INSERT INTO screen_grid_column (screen_id, field_key, label, field_type, width, sortable, editable, display_order, is_measure, is_dimension)
SELECT s.id, 'claimCost', '클레임 비용(원)', 'NUMBER', 140, true, true, 5, true, false
FROM dynamic_screen s WHERE s.screen_code = 'SCR_DYNAMIC_CLAIM'
  AND NOT EXISTS (SELECT 1 FROM screen_grid_column WHERE screen_id = s.id AND field_key = 'claimCost');

INSERT INTO screen_grid_column (screen_id, field_key, label, field_type, width, sortable, editable, display_order, is_measure, is_dimension)
SELECT s.id, 'status', '처리 상태', 'SELECT', 120, true, true, 6, false, true
FROM dynamic_screen s WHERE s.screen_code = 'SCR_DYNAMIC_CLAIM'
  AND NOT EXISTS (SELECT 1 FROM screen_grid_column WHERE screen_id = s.id AND field_key = 'status');
