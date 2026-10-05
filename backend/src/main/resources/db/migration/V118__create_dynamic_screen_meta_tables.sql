-- ============================================================================
-- V118: 동적 화면관리, 메뉴권한, 마스터 카탈로그, 그리드 컬럼, 폼 필드, 위젯/대시보드 메타 테이블 생성
-- H2 / PostgreSQL 교차 호환 ANSI SQL 준수
-- ============================================================================

-- 1. 동적 화면 정의
CREATE TABLE IF NOT EXISTS dynamic_screen (
  id BIGSERIAL PRIMARY KEY,
  screen_code VARCHAR(50) UNIQUE NOT NULL,
  screen_name VARCHAR(100) NOT NULL,
  screen_type VARCHAR(20) DEFAULT 'GRID',
  api_endpoint VARCHAR(200),
  target_table VARCHAR(100),
  description TEXT,
  enable_row_selection BOOLEAN DEFAULT false,
  row_selection_mode VARCHAR(10) DEFAULT 'MULTI',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. 동적 메뉴 (트리 구조)
CREATE TABLE IF NOT EXISTS dynamic_menu (
  id BIGSERIAL PRIMARY KEY,
  parent_id BIGINT REFERENCES dynamic_menu(id),
  menu_name VARCHAR(100) NOT NULL,
  menu_code VARCHAR(50) UNIQUE NOT NULL,
  menu_order INT DEFAULT 0,
  screen_id BIGINT REFERENCES dynamic_screen(id),
  icon VARCHAR(50),
  is_active BOOLEAN DEFAULT true
);

-- 3. 동적 메뉴 권한
CREATE TABLE IF NOT EXISTS dynamic_menu_permission (
  id BIGSERIAL PRIMARY KEY,
  menu_id BIGINT NOT NULL REFERENCES dynamic_menu(id),
  role_id BIGINT NOT NULL REFERENCES roles(id),
  can_view BOOLEAN DEFAULT true,
  can_create BOOLEAN DEFAULT false,
  can_edit BOOLEAN DEFAULT false,
  can_delete BOOLEAN DEFAULT false,
  UNIQUE(menu_id, role_id)
);

-- 4. 마스터 데이터 연결 카탈로그
CREATE TABLE IF NOT EXISTS master_data_source (
  id BIGSERIAL PRIMARY KEY,
  source_key VARCHAR(50) UNIQUE NOT NULL,
  source_table VARCHAR(100) NOT NULL,
  value_field VARCHAR(50) NOT NULL,
  display_field VARCHAR(50) NOT NULL,
  search_api_endpoint VARCHAR(200) NOT NULL,
  description VARCHAR(200)
);

-- 5. 검색조건 카탈로그
CREATE TABLE IF NOT EXISTS search_field_catalog (
  id BIGSERIAL PRIMARY KEY,
  catalog_key VARCHAR(50) UNIQUE NOT NULL,
  label VARCHAR(50) NOT NULL,
  field_type VARCHAR(20) NOT NULL,
  component_key VARCHAR(50) NOT NULL,
  relation_source_id BIGINT REFERENCES master_data_source(id)
);

-- 6. 화면별 검색조건
CREATE TABLE IF NOT EXISTS screen_search_field (
  id BIGSERIAL PRIMARY KEY,
  screen_id BIGINT NOT NULL REFERENCES dynamic_screen(id),
  catalog_id BIGINT NOT NULL REFERENCES search_field_catalog(id),
  display_order INT DEFAULT 0
);

-- 7. 그리드 컬럼 정의 (Notion 속성)
CREATE TABLE IF NOT EXISTS screen_grid_column (
  id BIGSERIAL PRIMARY KEY,
  screen_id BIGINT NOT NULL REFERENCES dynamic_screen(id),
  field_key VARCHAR(50) NOT NULL,
  label VARCHAR(50) NOT NULL,
  field_type VARCHAR(20) NOT NULL,
  relation_source_id BIGINT REFERENCES master_data_source(id),
  width INT,
  sortable BOOLEAN DEFAULT true,
  editable BOOLEAN DEFAULT false,
  display_order INT DEFAULT 0,
  is_measure BOOLEAN DEFAULT false,
  is_dimension BOOLEAN DEFAULT false,
  aggregation_type VARCHAR(10),
  is_primary_date BOOLEAN DEFAULT false,
  is_excluded_from_dashboard BOOLEAN DEFAULT false
);

-- 8. 사용자별 그리드 뷰 (Notion 속성 토글)
CREATE TABLE IF NOT EXISTS screen_grid_user_view (
  id BIGSERIAL PRIMARY KEY,
  screen_id BIGINT NOT NULL REFERENCES dynamic_screen(id),
  user_id BIGINT NOT NULL,
  column_id BIGINT NOT NULL REFERENCES screen_grid_column(id),
  is_visible BOOLEAN DEFAULT true,
  column_order INT,
  UNIQUE(screen_id, user_id, column_id)
);

-- 9. 등록 폼 서브페이지
CREATE TABLE IF NOT EXISTS screen_sub_page (
  id BIGSERIAL PRIMARY KEY,
  parent_screen_id BIGINT NOT NULL REFERENCES dynamic_screen(id),
  page_type VARCHAR(20) DEFAULT 'MODAL',
  button_label VARCHAR(50)
);

-- 10. 등록 폼 필드
CREATE TABLE IF NOT EXISTS screen_form_field (
  id BIGSERIAL PRIMARY KEY,
  sub_page_id BIGINT NOT NULL REFERENCES screen_sub_page(id),
  field_key VARCHAR(50) NOT NULL,
  label VARCHAR(50) NOT NULL,
  field_type VARCHAR(20) NOT NULL,
  relation_source_id BIGINT REFERENCES master_data_source(id),
  is_required BOOLEAN DEFAULT false,
  display_order INT DEFAULT 0,
  max_file_count INT DEFAULT 5,
  accepted_file_types VARCHAR(100)
);

-- 11. 범용 첨부 (기존 stored_files와 연동)
CREATE TABLE IF NOT EXISTS dynamic_attachment (
  id BIGSERIAL PRIMARY KEY,
  screen_id BIGINT NOT NULL REFERENCES dynamic_screen(id),
  record_id BIGINT NOT NULL,
  field_key VARCHAR(50) NOT NULL,
  stored_file_path VARCHAR(500) NOT NULL,
  file_type VARCHAR(20) DEFAULT 'FILE',
  uploaded_by BIGINT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 12. 위젯 카탈로그
CREATE TABLE IF NOT EXISTS widget_catalog (
  id BIGSERIAL PRIMARY KEY,
  widget_type VARCHAR(30) NOT NULL,
  compatible_data_type VARCHAR(20),
  component_key VARCHAR(50) NOT NULL,
  design_token VARCHAR(50)
);

-- 13. 대시보드
CREATE TABLE IF NOT EXISTS dynamic_dashboard (
  id BIGSERIAL PRIMARY KEY,
  source_screen_id BIGINT REFERENCES dynamic_screen(id),
  dashboard_name VARCHAR(100) NOT NULL,
  created_by BIGINT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 14. 대시보드 위젯
CREATE TABLE IF NOT EXISTS dashboard_widget (
  id BIGSERIAL PRIMARY KEY,
  dashboard_id BIGINT NOT NULL REFERENCES dynamic_dashboard(id),
  widget_id BIGINT NOT NULL REFERENCES widget_catalog(id),
  bound_field_key VARCHAR(50) NOT NULL,
  secondary_field_key VARCHAR(50),
  title VARCHAR(100),
  position_x INT DEFAULT 0,
  position_y INT DEFAULT 0,
  width INT DEFAULT 4,
  height INT DEFAULT 3
);
