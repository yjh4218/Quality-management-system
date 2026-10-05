-- ============================================================================
-- V119: 동적 화면관리 인덱스 및 카탈로그 / 샘플 화면 초기 시드 데이터
-- H2 / PostgreSQL 교차 호환 ANSI SQL 준수
-- ============================================================================

-- 1. 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_dynamic_menu_parent ON dynamic_menu(parent_id);
CREATE INDEX IF NOT EXISTS idx_screen_grid_column_screen ON screen_grid_column(screen_id);
CREATE INDEX IF NOT EXISTS idx_screen_grid_user_view_screen_user ON screen_grid_user_view(screen_id, user_id);
CREATE INDEX IF NOT EXISTS idx_dynamic_attachment_record ON dynamic_attachment(screen_id, record_id);
CREATE INDEX IF NOT EXISTS idx_dashboard_widget_dashboard ON dashboard_widget(dashboard_id);
CREATE INDEX IF NOT EXISTS idx_dynamic_menu_perm ON dynamic_menu_permission(menu_id, role_id);

-- 2. 마스터 데이터 소스 시드
INSERT INTO master_data_source (source_key, source_table, value_field, display_field, search_api_endpoint, description)
SELECT 'PRODUCT', 'products', 'id', 'product_name', '/api/products/search', '제품 마스터'
WHERE NOT EXISTS (SELECT 1 FROM master_data_source WHERE source_key = 'PRODUCT');

INSERT INTO master_data_source (source_key, source_table, value_field, display_field, search_api_endpoint, description)
SELECT 'MANUFACTURER', 'manufacturers', 'id', 'name', '/api/manufacturers/search', '제조사 마스터'
WHERE NOT EXISTS (SELECT 1 FROM master_data_source WHERE source_key = 'MANUFACTURER');

INSERT INTO master_data_source (source_key, source_table, value_field, display_field, search_api_endpoint, description)
SELECT 'CLAIM', 'claims', 'id', 'claim_number', '/api/claims/search', '클레임 마스터'
WHERE NOT EXISTS (SELECT 1 FROM master_data_source WHERE source_key = 'CLAIM');

INSERT INTO master_data_source (source_key, source_table, value_field, display_field, search_api_endpoint, description)
SELECT 'BOM', 'master_packaging_materials', 'id', 'material_name', '/api/bom/search', 'BOM 마스터'
WHERE NOT EXISTS (SELECT 1 FROM master_data_source WHERE source_key = 'BOM');

-- 3. 검색조건 카탈로그 시드
INSERT INTO search_field_catalog (catalog_key, label, field_type, component_key)
SELECT 'DATE_RANGE', '기간 검색', 'DATE_RANGE', 'DateRangePicker'
WHERE NOT EXISTS (SELECT 1 FROM search_field_catalog WHERE catalog_key = 'DATE_RANGE');

INSERT INTO search_field_catalog (catalog_key, label, field_type, component_key)
SELECT 'TEXT_SEARCH', '통합 키워드', 'TEXT', 'TextInput'
WHERE NOT EXISTS (SELECT 1 FROM search_field_catalog WHERE catalog_key = 'TEXT_SEARCH');

INSERT INTO search_field_catalog (catalog_key, label, field_type, component_key, relation_source_id)
SELECT 'PRODUCT_NAME', '제품명', 'RELATION', 'RelationSearch', ms.id
FROM master_data_source ms WHERE ms.source_key = 'PRODUCT'
  AND NOT EXISTS (SELECT 1 FROM search_field_catalog WHERE catalog_key = 'PRODUCT_NAME');

INSERT INTO search_field_catalog (catalog_key, label, field_type, component_key, relation_source_id)
SELECT 'MANUFACTURER_NAME', '제조사', 'RELATION', 'RelationSearch', ms.id
FROM master_data_source ms WHERE ms.source_key = 'MANUFACTURER'
  AND NOT EXISTS (SELECT 1 FROM search_field_catalog WHERE catalog_key = 'MANUFACTURER_NAME');

INSERT INTO search_field_catalog (catalog_key, label, field_type, component_key)
SELECT 'LOT_NO', 'LOT 번호', 'TEXT', 'TextInput'
WHERE NOT EXISTS (SELECT 1 FROM search_field_catalog WHERE catalog_key = 'LOT_NO');

INSERT INTO search_field_catalog (catalog_key, label, field_type, component_key)
SELECT 'STATUS', '진행 상태', 'SELECT', 'SelectBox'
WHERE NOT EXISTS (SELECT 1 FROM search_field_catalog WHERE catalog_key = 'STATUS');

-- 4. 위젯 카탈로그 시드
INSERT INTO widget_catalog (widget_type, compatible_data_type, component_key, design_token)
SELECT 'KPI_CARD', 'NUMBER', 'KpiCard', 'primary'
WHERE NOT EXISTS (SELECT 1 FROM widget_catalog WHERE widget_type = 'KPI_CARD');

INSERT INTO widget_catalog (widget_type, compatible_data_type, component_key, design_token)
SELECT 'LINE_CHART', 'NUMBER', 'LineChart', 'accent'
WHERE NOT EXISTS (SELECT 1 FROM widget_catalog WHERE widget_type = 'LINE_CHART');

INSERT INTO widget_catalog (widget_type, compatible_data_type, component_key, design_token)
SELECT 'BAR_CHART', 'NUMBER', 'BarChart', 'secondary'
WHERE NOT EXISTS (SELECT 1 FROM widget_catalog WHERE widget_type = 'BAR_CHART');

INSERT INTO widget_catalog (widget_type, compatible_data_type, component_key, design_token)
SELECT 'PIE_CHART', 'TEXT', 'PieChart', 'tertiary'
WHERE NOT EXISTS (SELECT 1 FROM widget_catalog WHERE widget_type = 'PIE_CHART');

-- 5. 샘플 동적 화면 등록 (1: 제품 노션형 다이나믹 뷰)
INSERT INTO dynamic_screen (screen_code, screen_name, screen_type, api_endpoint, target_table, description, enable_row_selection, row_selection_mode, is_active)
SELECT 'SCR_NOTION_PRODUCT', '제품 메타 다이나믹 뷰 (Notion형)', 'GRID', '/api/products', 'products', 'Notion 속성형 제품 동적 그리드 및 사용자 커스텀 컬럼 뷰', true, 'MULTI', true
WHERE NOT EXISTS (SELECT 1 FROM dynamic_screen WHERE screen_code = 'SCR_NOTION_PRODUCT');

-- 6. 샘플 동적 화면 등록 (2: 클레임 다이나믹 분석 뷰)
INSERT INTO dynamic_screen (screen_code, screen_name, screen_type, api_endpoint, target_table, description, enable_row_selection, row_selection_mode, is_active)
SELECT 'SCR_DYNAMIC_CLAIM', '클레임 다이나믹 분석 뷰', 'GRID', '/api/claims', 'claims', '규칙 기반 대시보드 자동 연동 클레임 그리드', true, 'MULTI', true
WHERE NOT EXISTS (SELECT 1 FROM dynamic_screen WHERE screen_code = 'SCR_DYNAMIC_CLAIM');

-- 7. 샘플 화면별 검색조건 매핑 (SCR_NOTION_PRODUCT)
INSERT INTO screen_search_field (screen_id, catalog_id, display_order)
SELECT s.id, c.id, 1
FROM dynamic_screen s, search_field_catalog c
WHERE s.screen_code = 'SCR_NOTION_PRODUCT' AND c.catalog_key = 'TEXT_SEARCH'
  AND NOT EXISTS (
    SELECT 1 FROM screen_search_field ssf 
    WHERE ssf.screen_id = s.id AND ssf.catalog_id = c.id
  );

INSERT INTO screen_search_field (screen_id, catalog_id, display_order)
SELECT s.id, c.id, 2
FROM dynamic_screen s, search_field_catalog c
WHERE s.screen_code = 'SCR_NOTION_PRODUCT' AND c.catalog_key = 'MANUFACTURER_NAME'
  AND NOT EXISTS (
    SELECT 1 FROM screen_search_field ssf 
    WHERE ssf.screen_id = s.id AND ssf.catalog_id = c.id
  );

-- 8. 샘플 화면별 그리드 컬럼 매핑 (SCR_NOTION_PRODUCT)
INSERT INTO screen_grid_column (screen_id, field_key, label, field_type, width, sortable, editable, display_order, is_measure, is_dimension)
SELECT s.id, 'itemCode', '품목코드', 'TEXT', 140, true, false, 1, false, true
FROM dynamic_screen s WHERE s.screen_code = 'SCR_NOTION_PRODUCT'
  AND NOT EXISTS (SELECT 1 FROM screen_grid_column WHERE screen_id = s.id AND field_key = 'itemCode');

INSERT INTO screen_grid_column (screen_id, field_key, label, field_type, width, sortable, editable, display_order, is_measure, is_dimension)
SELECT s.id, 'productName', '제품명', 'TEXT', 220, true, true, 2, false, true
FROM dynamic_screen s WHERE s.screen_code = 'SCR_NOTION_PRODUCT'
  AND NOT EXISTS (SELECT 1 FROM screen_grid_column WHERE screen_id = s.id AND field_key = 'productName');

INSERT INTO screen_grid_column (screen_id, field_key, label, field_type, width, sortable, editable, display_order, is_measure, is_dimension)
SELECT s.id, 'brand', '브랜드', 'TEXT', 120, true, true, 3, false, true
FROM dynamic_screen s WHERE s.screen_code = 'SCR_NOTION_PRODUCT'
  AND NOT EXISTS (SELECT 1 FROM screen_grid_column WHERE screen_id = s.id AND field_key = 'brand');

INSERT INTO screen_grid_column (screen_id, field_key, label, field_type, width, sortable, editable, display_order, is_measure, is_dimension)
SELECT s.id, 'manufacturer', '제조사', 'RELATION', 150, true, false, 4, false, true
FROM dynamic_screen s WHERE s.screen_code = 'SCR_NOTION_PRODUCT'
  AND NOT EXISTS (SELECT 1 FROM screen_grid_column WHERE screen_id = s.id AND field_key = 'manufacturer');

-- 9. 동적 메뉴 루트 및 하위 메뉴 시드
INSERT INTO dynamic_menu (parent_id, menu_name, menu_code, menu_order, icon, is_active)
SELECT NULL, '동적 화면 관리', 'DYNAMIC_ROOT', 90, '⚡', true
WHERE NOT EXISTS (SELECT 1 FROM dynamic_menu WHERE menu_code = 'DYNAMIC_ROOT');

INSERT INTO dynamic_menu (parent_id, menu_name, menu_code, menu_order, screen_id, icon, is_active)
SELECT p.id, '제품 메타 그리드 (Notion형)', 'DYN_MENU_PRODUCT', 1, s.id, '📋', true
FROM dynamic_menu p, dynamic_screen s
WHERE p.menu_code = 'DYNAMIC_ROOT' AND s.screen_code = 'SCR_NOTION_PRODUCT'
  AND NOT EXISTS (SELECT 1 FROM dynamic_menu WHERE menu_code = 'DYN_MENU_PRODUCT');

INSERT INTO dynamic_menu (parent_id, menu_name, menu_code, menu_order, screen_id, icon, is_active)
SELECT p.id, '클레임 다이나믹 분석', 'DYN_MENU_CLAIM', 2, s.id, '📊', true
FROM dynamic_menu p, dynamic_screen s
WHERE p.menu_code = 'DYNAMIC_ROOT' AND s.screen_code = 'SCR_DYNAMIC_CLAIM'
  AND NOT EXISTS (SELECT 1 FROM dynamic_menu WHERE menu_code = 'DYN_MENU_CLAIM');

-- 10. 관리자 역할(ROLE_ADMIN)에 동적 메뉴 기본 권한 부여
INSERT INTO dynamic_menu_permission (menu_id, role_id, can_view, can_create, can_edit, can_delete)
SELECT m.id, r.id, true, true, true, true
FROM dynamic_menu m, roles r
WHERE r.role_key = 'ROLE_ADMIN'
  AND NOT EXISTS (SELECT 1 FROM dynamic_menu_permission dmp WHERE dmp.menu_id = m.id AND dmp.role_id = r.id);
