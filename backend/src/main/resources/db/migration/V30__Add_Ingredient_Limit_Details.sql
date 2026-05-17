CREATE TABLE ingredient_limit_details (
    id SERIAL PRIMARY KEY,
    ingredient_id BIGINT NOT NULL,
    country VARCHAR(10) NOT NULL,
    product_type VARCHAR(100), -- RINSE_OFF, LEAVE_ON, etc.
    limit_percent DOUBLE PRECISION,
    condition_text TEXT,
    is_manual BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_limit_ingredient FOREIGN KEY (ingredient_id) REFERENCES regulatory_ingredients(id) ON DELETE CASCADE
);

CREATE INDEX idx_limit_ingredient_id ON ingredient_limit_details(ingredient_id);
