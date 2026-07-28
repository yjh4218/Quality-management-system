-- [MIGRATION] Comprehensive Schema Alignment (Postgres Production)
-- Ensures all columns required by the latest Java Entities exist.
-- This script is idempotent (can be run multiple times safely).

-- 1. Table: products
-- Generic Info
ALTER TABLE products ADD COLUMN IF NOT EXISTS version BIGINT DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS ingredients TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_parent BOOLEAN DEFAULT FALSE;
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_master BOOLEAN DEFAULT FALSE;
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_planning_set BOOLEAN DEFAULT FALSE;

-- Shelf Life and Specs
ALTER TABLE products ADD COLUMN IF NOT EXISTS opened_shelf_life_months INTEGER;
ALTER TABLE products ADD COLUMN IF NOT EXISTS capacity_fl_oz DOUBLE PRECISION;
ALTER TABLE products ADD COLUMN IF NOT EXISTS weight_oz DOUBLE PRECISION;

-- Dimensions Status (CRITICAL for search results)
ALTER TABLE products ADD COLUMN IF NOT EXISTS status VARCHAR(255) DEFAULT '가안';

-- 2. Table: users
ALTER TABLE users ADD COLUMN IF NOT EXISTS name VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS company_name VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS department VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS failed_attempts INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS locked BOOLEAN DEFAULT FALSE;

-- 3. Table: roles (Expansion)
ALTER TABLE roles ADD COLUMN IF NOT EXISTS allowed_menus TEXT;
ALTER TABLE roles ADD COLUMN IF NOT EXISTS allowed_permissions TEXT;
ALTER TABLE roles ADD COLUMN IF NOT EXISTS dashboard_layout_id BIGINT;
