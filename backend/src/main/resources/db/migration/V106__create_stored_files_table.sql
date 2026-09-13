-- [배포 환경 파일/사진 영구 보존 및 자가 복구 캐시 테이블]
-- Supabase PostgreSQL 및 로컬 H2 완전 호환 스키마

CREATE TABLE IF NOT EXISTS stored_files (
    file_path VARCHAR(500) PRIMARY KEY,
    file_name VARCHAR(255) NOT NULL,
    content_type VARCHAR(100),
    file_size BIGINT,
    file_data BYTEA NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_stored_files_created_at ON stored_files(created_at);
