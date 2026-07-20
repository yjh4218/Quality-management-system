-- V60: 필수서류 자동요청 시스템을 위한 테이블 정의
CREATE TABLE custom_document_types (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    period_months INT NOT NULL,
    recurrence_type VARCHAR(50) NOT NULL, -- 'ONE_TIME', 'PERIODIC'
    scope VARCHAR(50) NOT NULL, -- 'PRODUCT', 'MANUFACTURER'
    is_active BOOLEAN DEFAULT TRUE NOT NULL
);

CREATE TABLE document_requirements (
    id BIGSERIAL PRIMARY KEY,
    product_id BIGINT,
    manufacturer_id BIGINT,
    document_enum_type VARCHAR(100), -- 'MSDS', 'MANUFACTURING_PROCESS_CHART', 'PRODUCT_STANDARD', 'STABILITY_TEST' 등
    custom_document_type_id BIGINT,
    last_received_date DATE,
    next_due_date DATE,
    status VARCHAR(50) NOT NULL, -- 'PENDING', 'REQUESTED', 'FULFILLED', 'OVERDUE'
    
    CONSTRAINT fk_req_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL,
    CONSTRAINT fk_req_manufacturer FOREIGN KEY (manufacturer_id) REFERENCES manufacturers(id) ON DELETE SET NULL,
    CONSTRAINT fk_req_custom_type FOREIGN KEY (custom_document_type_id) REFERENCES custom_document_types(id) ON DELETE SET NULL,
    
    -- product_id 와 manufacturer_id 중 하나만 채워지도록 CHECK 제약조건 추가
    CONSTRAINT chk_requirement_scope CHECK (
        (product_id IS NOT NULL AND manufacturer_id IS NULL) OR
        (product_id IS NULL AND manufacturer_id IS NOT NULL)
    )
);

CREATE TABLE document_request_logs (
    id BIGSERIAL PRIMARY KEY,
    requirement_id BIGINT NOT NULL,
    requested_at TIMESTAMP NOT NULL,
    upload_token VARCHAR(255) NOT NULL UNIQUE,
    token_expires_at TIMESTAMP NOT NULL,
    uploaded_at TIMESTAMP,
    uploaded_file_url VARCHAR(1000),
    email_sent_to VARCHAR(255) NOT NULL,
    reminder_count INT DEFAULT 0 NOT NULL,
    
    CONSTRAINT fk_log_requirement FOREIGN KEY (requirement_id) REFERENCES document_requirements(id) ON DELETE CASCADE
);
