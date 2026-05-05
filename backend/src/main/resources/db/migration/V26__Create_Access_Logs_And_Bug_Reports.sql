-- [MIGRATION] Add Access Logs and Bug Reports tables
-- Target: Postgres / H2

CREATE TABLE IF NOT EXISTS access_logs (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    action VARCHAR(50) NOT NULL,
    page_url VARCHAR(255),
    page_name VARCHAR(255),
    ip_address VARCHAR(100),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS bug_reports (
    id SERIAL PRIMARY KEY,
    description TEXT NOT NULL,
    steps TEXT,
    screen_name VARCHAR(255),
    url TEXT,
    severity VARCHAR(50),
    status VARCHAR(50) DEFAULT 'OPEN',
    reporter_username VARCHAR(255),
    reporter_name VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
