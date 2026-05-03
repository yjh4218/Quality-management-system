-- [MIGRATION] Sync Production Database Schema (Feature Catch-up)
-- Target: Postgres / H2

-- 1. Sales Channels Master Data
CREATE TABLE IF NOT EXISTS sales_channels (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description VARCHAR(255),
    active BOOLEAN DEFAULT TRUE,
    updated_by VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Dashboard Layouts and Page Guides (Ensuring existence)
CREATE TABLE IF NOT EXISTS dashboard_layouts (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    widget_config TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS page_guides (
    id SERIAL PRIMARY KEY,
    page_key VARCHAR(100) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    sections_json TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Production Audit System
CREATE TABLE IF NOT EXISTS production_audit (
    id SERIAL PRIMARY KEY,
    item_code VARCHAR(100) NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    manufacturer_name VARCHAR(255) NOT NULL,
    production_date DATE,
    upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    container_images TEXT,
    box_images TEXT,
    load_images TEXT,
    status VARCHAR(50),
    rejection_reason TEXT,
    is_disclosed BOOLEAN DEFAULT FALSE,
    is_deleted BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS production_audit_history (
    id SERIAL PRIMARY KEY,
    audit_id BIGINT NOT NULL,
    modifier VARCHAR(255),
    modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    field_name VARCHAR(100),
    old_value TEXT,
    new_value TEXT
);

-- 4. Product Entity Expansions (Collection & Join Tables)
CREATE TABLE IF NOT EXISTS product_images (
    product_id BIGINT NOT NULL,
    image_path VARCHAR(500) NOT NULL,
    CONSTRAINT fk_product_images FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS product_packaging_certificates (
    product_id BIGINT NOT NULL,
    certificate_path VARCHAR(500) NOT NULL,
    CONSTRAINT fk_product_certs FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS product_sales_channels (
    product_id BIGINT NOT NULL,
    channel_id BIGINT NOT NULL,
    PRIMARY KEY (product_id, channel_id),
    CONSTRAINT fk_p_channel_p FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    CONSTRAINT fk_p_channel_c FOREIGN KEY (channel_id) REFERENCES sales_channels(id) ON DELETE CASCADE
);

-- 5. Role and Product Column Sync
DO $$ 
BEGIN 
    -- Roles: Add missing columns if they don't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='roles' AND column_name='allowed_menus') THEN
        ALTER TABLE roles ADD COLUMN allowed_menus TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='roles' AND column_name='allowed_permissions') THEN
        ALTER TABLE roles ADD COLUMN allowed_permissions TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='roles' AND column_name='dashboard_layout_id') THEN
        ALTER TABLE roles ADD COLUMN dashboard_layout_id BIGINT;
    END IF;
    
    -- Products: Add photo audit disclosed column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='photo_audit_disclosed') THEN
        ALTER TABLE products ADD COLUMN photo_audit_disclosed BOOLEAN DEFAULT FALSE;
    END IF;
END $$;
