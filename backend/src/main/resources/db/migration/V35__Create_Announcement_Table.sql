-- [MIGRATION] Add Announcement table and sequence
-- Target: Postgres / H2

CREATE SEQUENCE IF NOT EXISTS announcement_number_seq START WITH 1 INCREMENT BY 1;

CREATE TABLE IF NOT EXISTS announcements (
    id SERIAL PRIMARY KEY,
    announcement_number VARCHAR(100) NOT NULL UNIQUE,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    target_roles TEXT,
    created_by_username VARCHAR(255) NOT NULL,
    created_by_name VARCHAR(255),
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
