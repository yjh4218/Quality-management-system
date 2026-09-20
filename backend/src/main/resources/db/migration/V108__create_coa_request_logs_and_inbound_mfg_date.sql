-- V108: Create coa_request_logs table and add mfg_date to wms_inbound table

-- 1. Add mfg_date to wms_inbound
ALTER TABLE wms_inbound ADD COLUMN IF NOT EXISTS mfg_date VARCHAR(50);

-- 2. Create coa_request_logs table
CREATE TABLE IF NOT EXISTS coa_request_logs (
    id BIGSERIAL PRIMARY KEY,
    inbound_id BIGINT,
    grn_number VARCHAR(100),
    item_code VARCHAR(100),
    product_name VARCHAR(255),
    lot_number VARCHAR(100),
    manufacturer VARCHAR(255),
    recipient_email VARCHAR(255),
    requested_at TIMESTAMP NOT NULL,
    requested_by VARCHAR(100),
    status VARCHAR(50) DEFAULT 'REQUESTED',
    reminder_count INT DEFAULT 0,
    last_reminded_at TIMESTAMP,
    fulfilled_at TIMESTAMP,
    lead_time_hours DOUBLE PRECISION,
    is_deleted BOOLEAN DEFAULT FALSE
);

-- 3. Indexes for query performance and audit reporting
CREATE INDEX IF NOT EXISTS idx_coa_req_inbound_id ON coa_request_logs(inbound_id);
CREATE INDEX IF NOT EXISTS idx_coa_req_status ON coa_request_logs(status);
CREATE INDEX IF NOT EXISTS idx_coa_req_manufacturer ON coa_request_logs(manufacturer);
CREATE INDEX IF NOT EXISTS idx_coa_req_requested_at ON coa_request_logs(requested_at);
