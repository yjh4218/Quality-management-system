-- V62_1: V63 인덱스 생성 전 system_page_guides 테이블 안전 선작성
CREATE TABLE IF NOT EXISTS system_page_guides (
    id BIGSERIAL PRIMARY KEY,
    page_key VARCHAR(255) NOT NULL UNIQUE,
    title VARCHAR(255) NOT NULL,
    sections_json TEXT,
    content TEXT,
    updated_by VARCHAR(255),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
