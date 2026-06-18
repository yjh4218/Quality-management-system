-- products 테이블 감리 공개 상태 컬럼 누락 보정
ALTER TABLE products ADD COLUMN IF NOT EXISTS photo_audit_disclosed BOOLEAN DEFAULT FALSE;

-- wms_inbound 테이블 품질 확인 특이사항 및 비고 컬럼 누락 보정
ALTER TABLE wms_inbound ADD COLUMN IF NOT EXISTS control_sample_remarks TEXT;
ALTER TABLE wms_inbound ADD COLUMN IF NOT EXISTS final_inspection_remarks TEXT;
ALTER TABLE wms_inbound ADD COLUMN IF NOT EXISTS mfr_remarks TEXT;
