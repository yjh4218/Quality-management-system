-- V62__Add_Document_Request_Indexes.sql
-- document_requirements 및 document_request_logs 검색 성능 최적화를 위한 단일/복합 인덱스 생성

-- 1. document_requirements 외래키 및 상태 조건 인덱스
CREATE INDEX IF NOT EXISTS idx_doc_req_product_id ON document_requirements(product_id);
CREATE INDEX IF NOT EXISTS idx_doc_req_manufacturer_id ON document_requirements(manufacturer_id);
CREATE INDEX IF NOT EXISTS idx_doc_req_status ON document_requirements(status);
CREATE INDEX IF NOT EXISTS idx_doc_req_next_due_date ON document_requirements(next_due_date);
CREATE INDEX IF NOT EXISTS idx_doc_req_custom_type ON document_requirements(custom_document_type_id);

-- 2. document_requirements 스케줄러 전용 복합 인덱스 (status + next_due_date)
CREATE INDEX IF NOT EXISTS idx_doc_req_status_next_due ON document_requirements(status, next_due_date);

-- 3. document_request_logs 외래키 인덱스
CREATE INDEX IF NOT EXISTS idx_doc_req_log_requirement_id ON document_request_logs(requirement_id);
