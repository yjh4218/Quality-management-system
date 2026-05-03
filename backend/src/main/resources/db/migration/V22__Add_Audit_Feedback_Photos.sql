-- V22: 제조사 Audit 피드백 필드 및 사진 첨부 기능 추가

-- 1. manufacturer_audits 테이블에 긍정/부정 피드백 필드 추가
ALTER TABLE manufacturer_audits ADD COLUMN positive_feedback TEXT;
ALTER TABLE manufacturer_audits ADD COLUMN negative_feedback TEXT;

-- 2. 긍정적인 부분 사진 경로 저장을 위한 테이블 생성
CREATE TABLE manufacturer_audit_positive_photos (
    audit_id BIGINT NOT NULL,
    photo_url VARCHAR(255) NOT NULL,
    FOREIGN KEY (audit_id) REFERENCES manufacturer_audits(id) ON DELETE CASCADE
);

-- 3. 부적합 항목 사진 경로 저장을 위한 테이블 생성
CREATE TABLE manufacturer_audit_negative_photos (
    audit_id BIGINT NOT NULL,
    photo_url VARCHAR(255) NOT NULL,
    FOREIGN KEY (audit_id) REFERENCES manufacturer_audits(id) ON DELETE CASCADE
);

-- 4. 기존 제조사 데이터 보정 (빈 문자열 ''을 M-id 형식으로 강제 치환)
UPDATE manufacturers SET manufacturer_code = 'M-' || id WHERE manufacturer_code IS NULL OR manufacturer_code = '';
