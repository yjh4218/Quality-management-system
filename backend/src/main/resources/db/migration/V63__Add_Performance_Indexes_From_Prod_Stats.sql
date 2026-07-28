-- V63__Add_Performance_Indexes_From_Prod_Stats.sql
-- 실제 운영 DB 통계(pg_stat_user_tables / pg_stat_statements) 실측 결과 기반 인덱스 생성

-- 1. channel_packaging_rules (스캔 빈도 최상위 3,156회 풀스캔 방지)
CREATE INDEX IF NOT EXISTS idx_channel_rules_channel_id ON channel_packaging_rules(channel_id);
CREATE INDEX IF NOT EXISTS idx_channel_rules_channel_type ON channel_packaging_rules(channel_id, rule_type);

-- 2. system_page_guides (스캔 횟수 1위 3,672회 풀스캔 방지)
CREATE INDEX IF NOT EXISTS idx_page_guides_page_key ON system_page_guides(page_key);

-- 3. wms_inbound (스캔당 730행 비효율 조치)
CREATE INDEX IF NOT EXISTS idx_wms_inbound_date ON wms_inbound(inbound_date);
CREATE INDEX IF NOT EXISTS idx_wms_inbound_mfr_status ON wms_inbound(manufacturer, overall_status);
CREATE INDEX IF NOT EXISTS idx_wms_inbound_grn ON wms_inbound(grn_number);

-- 4. audit_logs (누적 테이블 대량 스캔 사전 대비)
CREATE INDEX IF NOT EXISTS idx_audit_logs_modified_user ON audit_logs(modified_at, modifier_username);

-- 5. product_images (외래키 조회 성능 향상)
CREATE INDEX IF NOT EXISTS idx_product_images_product_id ON product_images(product_id);
