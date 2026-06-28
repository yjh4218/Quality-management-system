-- Alter notification_settings table to add description column
ALTER TABLE notification_settings ADD COLUMN IF NOT EXISTS description VARCHAR(1000);

-- Update description for initial seeded notification rules settings
UPDATE notification_settings 
SET description = '제조사에서 재발방지 대책 조치 결과를 수립하여 제출했을 때 발생합니다.' 
WHERE event_type = 'MFR_SUBMIT_CAPA';

UPDATE notification_settings 
SET description = '품질담당자가 신규 클레임을 등록하고 제조사에 공유했을 때 발생합니다.' 
WHERE event_type = 'NEW_CLAIM_SHARE';

UPDATE notification_settings 
SET description = '제조사가 제출한 대책이 미흡하여 재발방지 대책을 다시 수립하라고 요청했을 때 발생합니다.' 
WHERE event_type = 'RE_REQUEST_CAPA';

UPDATE notification_settings 
SET description = '품질팀에서 신규 생산감사 일정을 수립하여 공유했을 때 발생합니다.' 
WHERE event_type = 'NEW_AUDIT';
