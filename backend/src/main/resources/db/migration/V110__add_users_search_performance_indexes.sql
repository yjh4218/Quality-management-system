-- V110: 사용자(Users) 수신자 자동완성 고속 검색 인덱스 (H2 & PostgreSQL 교차 호환)
CREATE INDEX IF NOT EXISTS idx_users_enabled_email ON users(enabled, email);
CREATE INDEX IF NOT EXISTS idx_users_name ON users(name);
CREATE INDEX IF NOT EXISTS idx_users_company_name ON users(company_name);
CREATE INDEX IF NOT EXISTS idx_users_department ON users(department);
