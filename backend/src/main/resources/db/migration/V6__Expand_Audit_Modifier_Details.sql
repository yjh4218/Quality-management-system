-- 감사 로그 및 각 도메인별 변경 이력 테이블의 수정자 상세 정보 컬럼 추가

-- 1. 전역 감사 로그 테이블
ALTER TABLE audit_logs ADD COLUMN modifier_id BIGINT;
ALTER TABLE audit_logs ADD COLUMN modifier_username VARCHAR(50);
ALTER TABLE audit_logs ADD COLUMN modifier_name VARCHAR(100);
ALTER TABLE audit_logs ADD COLUMN modifier_company VARCHAR(100);

-- 2. 제품 변경 이력
ALTER TABLE product_history ADD COLUMN modifier_id BIGINT;
ALTER TABLE product_history ADD COLUMN modifier_username VARCHAR(50);
ALTER TABLE product_history ADD COLUMN modifier_name VARCHAR(100);
ALTER TABLE product_history ADD COLUMN modifier_company VARCHAR(100);

-- 3. 클레임 변경 이력
ALTER TABLE claim_history ADD COLUMN modifier_id BIGINT;
ALTER TABLE claim_history ADD COLUMN modifier_username VARCHAR(50);
ALTER TABLE claim_history ADD COLUMN modifier_name VARCHAR(100);
ALTER TABLE claim_history ADD COLUMN modifier_company VARCHAR(100);

-- 4. 입고 품질 변경 이력 (wms_inbound_history)
ALTER TABLE wms_inbound_history ADD COLUMN modifier_id BIGINT;
ALTER TABLE wms_inbound_history ADD COLUMN modifier_username VARCHAR(50);
ALTER TABLE wms_inbound_history ADD COLUMN modifier_name VARCHAR(100);
ALTER TABLE wms_inbound_history ADD COLUMN modifier_company VARCHAR(100);

-- 5. 생산감리 변경 이력 (production_audit_history)
ALTER TABLE production_audit_history ADD COLUMN modifier_id BIGINT;
ALTER TABLE production_audit_history ADD COLUMN modifier_username VARCHAR(50);
ALTER TABLE production_audit_history ADD COLUMN modifier_name VARCHAR(100);
ALTER TABLE production_audit_history ADD COLUMN modifier_company VARCHAR(100);
