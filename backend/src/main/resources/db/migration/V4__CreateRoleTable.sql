-- [MIGRATION] Dynamic Role Management System
-- Target: Postgres / H2

CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    role_key VARCHAR(50) UNIQUE NOT NULL, -- e.g. ROLE_ADMIN, ROLE_QUALITY
    display_name VARCHAR(100) NOT NULL,   -- e.g. System Administrator, Quality Manager
    description TEXT,
    is_system_role BOOLEAN DEFAULT FALSE, -- Prevent deletion of core roles
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed Initial Roles from RoleConstants
INSERT INTO roles (role_key, display_name, description, is_system_role) VALUES
('ROLE_ADMIN', '시스템 관리자', '전체 시스템 관리 및 설정 권한', TRUE),
('ROLE_RESPONSIBLE_SALES', '화장품책임판매관리자', '영업 및 사용자 승인 관리 권한', TRUE),
('ROLE_QUALITY', '품질 담당자', '입고 품질 검사 및 상태 판정 권한', TRUE),
('ROLE_SALES', '영업담당자', '데이터 조회 및 대시보드 열람 전용', TRUE),
('ROLE_MANUFACTURER', '제조사 담당자', '자사 제품 품질 정보 입력 권한', TRUE),
('ROLE_USER', '일반 사용자', '기본 대시보드 접근 권한 (승인 대기)', TRUE)
ON CONFLICT (role_key) DO NOTHING;
