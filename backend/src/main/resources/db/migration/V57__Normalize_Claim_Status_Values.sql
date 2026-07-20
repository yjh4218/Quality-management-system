-- V57__Normalize_Claim_Status_Values.sql
UPDATE claims SET quality_status = '0단계 (접수 대기)' WHERE quality_status LIKE '0.%' OR quality_status = '0단계 (접수 대기)';
UPDATE claims SET quality_status = '1단계 (원인 분석)' WHERE quality_status LIKE '1.%' OR quality_status = '1단계 (원인 분석)';
UPDATE claims SET quality_status = '3단계 (대책 적용)' WHERE quality_status LIKE '3.%' OR quality_status = '3단계 (대책 적용)';
UPDATE claims SET quality_status = '4단계 (효과 검증)' WHERE quality_status LIKE '4.%' OR quality_status = '4단계 (효과 검증)';

UPDATE claims SET mfr_status = '0단계 (접수 대기)' WHERE mfr_status IS NULL OR mfr_status LIKE '0.%' OR mfr_status = '0단계 (접수 대기)';
UPDATE claims SET mfr_status = '1단계 (원인 분석)' WHERE mfr_status LIKE '1.%' OR mfr_status = '1단계 (원인 분석)';
UPDATE claims SET mfr_status = '3단계 (대책 수립)' WHERE mfr_status LIKE '3.%' OR mfr_status = '3단계 (대책 수립)';
UPDATE claims SET mfr_status = '4단계 (대책 제출)' WHERE mfr_status LIKE '4.%' OR mfr_status = '4단계 (대책 제출)';
UPDATE claims SET mfr_status = '5단계 (종결)' WHERE mfr_status LIKE '5.%' OR mfr_status = '5단계 (종결)';
UPDATE claims SET mfr_status = '대책 재요청' WHERE mfr_status = '대책 재요청';
