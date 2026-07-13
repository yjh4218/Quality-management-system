-- V57__Normalize_Claim_Status_Values.sql
UPDATE claims SET quality_status = '0단계 (접수 대기)' WHERE quality_status = '0. 접수';
UPDATE claims SET quality_status = '1단계 (원인 분석)' WHERE quality_status = '1. 클레임 접수';
UPDATE claims SET quality_status = '3단계 (대책 적용)' WHERE quality_status = '3. 재발방지 수립/적용';
UPDATE claims SET quality_status = '4단계 (효과 검증)' WHERE quality_status = '4. 클레임 종결';

UPDATE claims SET mfr_status = '1단계 (원인 분석)' WHERE mfr_status = '1. 접수';
UPDATE claims SET mfr_status = '3단계 (대책 수립)' WHERE mfr_status = '3. 대책수립';
UPDATE claims SET mfr_status = '4단계 (대책 제출)' WHERE mfr_status = '4. 클레임 종결';
UPDATE claims SET mfr_status = '5단계 (종결)' WHERE mfr_status = '5단계 (종결)' OR mfr_status = '5. 종결';
UPDATE claims SET mfr_status = '대책 재요청' WHERE mfr_status = '대책 재요청';
UPDATE claims SET mfr_status = '0단계 (접수 대기)' WHERE mfr_status IS NULL OR mfr_status = '0단계 (접수 대기)';
