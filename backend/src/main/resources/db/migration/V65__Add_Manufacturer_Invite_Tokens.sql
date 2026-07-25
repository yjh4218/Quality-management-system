-- V65__Add_Manufacturer_Invite_Tokens.sql
-- 제조사 가입 전용 초대 토큰 테이블 생성

CREATE TABLE IF NOT EXISTS manufacturer_invite_tokens (
    id BIGSERIAL PRIMARY KEY,
    manufacturer_id BIGINT NOT NULL REFERENCES manufacturers(id),
    token VARCHAR(100) NOT NULL UNIQUE,
    created_by VARCHAR(100),
    expires_at TIMESTAMP NOT NULL,
    used_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_mfr_invite_token ON manufacturer_invite_tokens(token);
CREATE INDEX IF NOT EXISTS idx_mfr_invite_mfr_id ON manufacturer_invite_tokens(manufacturer_id);
