-- 통합 알림(Notification) 테이블 생성 및 고유 번호 시퀀스 SQL
CREATE SEQUENCE IF NOT EXISTS notification_number_seq START WITH 1 INCREMENT BY 1;

CREATE TABLE IF NOT EXISTS notifications (
    id BIGSERIAL PRIMARY KEY,
    notification_number VARCHAR(50) NOT NULL UNIQUE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) NOT NULL,
    target_username VARCHAR(100),
    target_role VARCHAR(100),
    target_company_name VARCHAR(100),
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    read_at TIMESTAMP,
    link_url VARCHAR(255),
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 사용자별 읽지 않은 알림을 빠르게 조회하기 위한 결합 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_notifications_target_unread 
ON notifications(target_username, is_read, is_deleted);

-- 정렬용 인덱스
CREATE INDEX IF NOT EXISTS idx_notifications_created_at 
ON notifications(created_at DESC);
