-- V69: QMS 데이터베이스 멀티테넌트 및 조회 속도 최적화 복합 인덱스 추가

-- 1. 제품(Products) 제조사 및 활성 상태 복합 인덱스
CREATE INDEX IF NOT EXISTS idx_products_mfr_status ON products(manufacturer_id, is_deleted, active, created_at DESC);

-- 2. 클레임(Claims) 제조사 및 공유 여부 복합 인덱스
CREATE INDEX IF NOT EXISTS idx_claims_mfr_shared_date ON claims(manufacturer, shared_with_manufacturer, receipt_date DESC);

-- 3. WMS 입고(WmsInbound) 제조사 및 입고일자 복합 인덱스
CREATE INDEX IF NOT EXISTS idx_wms_mfr_inbound_date ON wms_inbound(manufacturer, inbound_date DESC);

-- 4. 버그 리포트(BugReports) 에러 카테고리 및 생성일 복합 인덱스
CREATE INDEX IF NOT EXISTS idx_bug_reports_category_created ON bug_reports(error_category, created_at DESC);
