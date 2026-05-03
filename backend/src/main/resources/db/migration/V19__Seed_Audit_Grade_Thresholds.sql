-- V19: Audit 등급 기준 설정 초기 데이터 시딩
INSERT INTO system_settings (setting_key, setting_value, description) 
VALUES ('AUDIT_GRADE_THRESHOLDS', '{"A":90,"B":80,"C":70,"D":60}', '제조사 Audit 등급 산정 기준 점수')
ON CONFLICT (setting_key) DO NOTHING;
