-- V107: 고빈도 로그, 감사, 사진 컬렉션, 클레임 검색 최적화 인덱스 추가 (H2 & PostgreSQL 교차 호환)

-- 1. 접근 로그(Access Logs) 정렬 및 사용자별 조회 인덱스
CREATE INDEX IF NOT EXISTS idx_access_logs_created_at ON access_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_access_logs_user_created ON access_logs (username, created_at DESC);

-- 2. 버그 리포트(Bug Reports) 중복 검사 최적화 인덱스
CREATE INDEX IF NOT EXISTS idx_bug_reports_dup_check ON bug_reports (screen_name, error_category, created_at DESC);

-- 3. 클레임 사진(Claim Photos) 외래키 인덱스
CREATE INDEX IF NOT EXISTS idx_claim_photos_claim_id ON claim_photos (claim_id);

-- 4. 제조사 감사 사진(Manufacturer Audit Photos) 외래키 인덱스
CREATE INDEX IF NOT EXISTS idx_mfr_audit_pos_photos ON manufacturer_audit_positive_photos (audit_id);
CREATE INDEX IF NOT EXISTS idx_mfr_audit_neg_photos ON manufacturer_audit_negative_photos (audit_id);

-- 5. 제조사 감사(Manufacturer Audits) 일자 및 등급 복합 인덱스
CREATE INDEX IF NOT EXISTS idx_mfr_audits_date_grade ON manufacturer_audits (audit_date DESC, grade);

-- 6. 클레임(Claims) 접수일 정렬 인덱스
CREATE INDEX IF NOT EXISTS idx_claims_receipt_date_desc ON claims (receipt_date DESC);
