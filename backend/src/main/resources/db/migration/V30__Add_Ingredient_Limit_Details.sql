-- 1. Create primary regulatory_ingredients table if not exists
CREATE TABLE IF NOT EXISTS regulatory_ingredients (
    id BIGSERIAL PRIMARY KEY,
    inci_name VARCHAR(255) NOT NULL UNIQUE,
    korean_name VARCHAR(255),
    cas_number VARCHAR(50),
    kr_status VARCHAR(50),
    kr_limit DOUBLE PRECISION,
    eu_status VARCHAR(50),
    eu_limit DOUBLE PRECISION,
    cn_status VARCHAR(50),
    cn_limit DOUBLE PRECISION,
    us_status VARCHAR(50),
    us_limit DOUBLE PRECISION,
    jp_status VARCHAR(50),
    jp_limit DOUBLE PRECISION,
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_reg_inci_name ON regulatory_ingredients(inci_name);

-- 2. Create child ingredient_limit_details table
CREATE TABLE IF NOT EXISTS ingredient_limit_details (
    id BIGSERIAL PRIMARY KEY,
    ingredient_id BIGINT NOT NULL,
    country VARCHAR(10) NOT NULL,
    product_type VARCHAR(100), -- RINSE_OFF, LEAVE_ON, etc.
    limit_percent DOUBLE PRECISION,
    condition_text TEXT,
    is_manual BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_limit_ingredient FOREIGN KEY (ingredient_id) REFERENCES regulatory_ingredients(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_limit_ingredient_id ON ingredient_limit_details(ingredient_id);
