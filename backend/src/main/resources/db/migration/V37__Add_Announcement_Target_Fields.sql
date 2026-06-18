-- 전체공지사항 정밀 타겟팅용 컬럼 추가 (제조사 구분, 특정 제조사명, 특정 제조사 부서)
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS target_category VARCHAR(100);
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS target_manufacturer VARCHAR(100);
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS target_departments TEXT;
