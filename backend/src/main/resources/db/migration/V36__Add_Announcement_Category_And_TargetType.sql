-- 공지 분류(카테고리) 테이블
CREATE TABLE IF NOT EXISTS announcement_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,        -- 분류명 (긴급, 중요, 법령, 일반)
    color VARCHAR(7) NOT NULL DEFAULT '#475569', -- HEX 색상코드
    is_bold BOOLEAN DEFAULT FALSE,           -- 굵게 표시 여부
    sort_order INT DEFAULT 0,                -- 정렬 순서
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- announcements 테이블에 카테고리 ID 및 대상 타입 컬럼 추가
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS category_id BIGINT;
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS target_type VARCHAR(30) DEFAULT 'ALL';
-- target_type: 'ALL'(일괄공지), 'MANUFACTURER'(제조사), 'PACKAGING'(포장재 제조사)
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS email_sent BOOLEAN DEFAULT FALSE;
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS email_sent_at TIMESTAMP;

-- 기본 카테고리 데이터 삽입
INSERT INTO announcement_categories (name, color, is_bold, sort_order) VALUES
('긴급', '#dc2626', TRUE, 1),
('중요', '#ea580c', TRUE, 2),
('법령', '#2563eb', FALSE, 3),
('일반', '#475569', FALSE, 4);

-- 기존 전체공지 데이터 보정 (호환성 보장)
UPDATE announcements SET target_type = 'ALL' WHERE target_type IS NULL;
UPDATE announcements SET category_id = (SELECT id FROM announcement_categories WHERE name = '일반' LIMIT 1) WHERE category_id IS NULL;
