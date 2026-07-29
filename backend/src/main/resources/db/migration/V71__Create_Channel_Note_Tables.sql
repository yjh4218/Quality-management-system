-- V71: Create channel_note_categories and channel_special_notes tables
CREATE TABLE IF NOT EXISTS channel_note_categories (
    id BIGSERIAL PRIMARY KEY,
    category_key VARCHAR(100) NOT NULL UNIQUE,
    category_label VARCHAR(150) NOT NULL,
    display_order INT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS channel_special_notes (
    id BIGSERIAL PRIMARY KEY,
    channel_id BIGINT NOT NULL,
    category_id BIGINT NOT NULL,
    note_content TEXT,
    file_url VARCHAR(500),
    file_type VARCHAR(50),
    expiry_option VARCHAR(100),
    custom_expiry_format VARCHAR(200),
    updated_by VARCHAR(255),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_csn_channel FOREIGN KEY (channel_id) REFERENCES sales_channels(id) ON DELETE CASCADE,
    CONSTRAINT fk_csn_category FOREIGN KEY (category_id) REFERENCES channel_note_categories(id) ON DELETE CASCADE,
    CONSTRAINT uk_csn_channel_category UNIQUE (channel_id, category_id)
);
