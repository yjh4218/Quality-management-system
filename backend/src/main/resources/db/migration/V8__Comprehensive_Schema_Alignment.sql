-- [MIGRATION] Comprehensive Schema Alignment (Postgres Production)
-- Ensures all columns required by the latest Java Entities exist in Supabase.
-- This script is idempotent (can be run multiple times safely).

DO $$ 
BEGIN 
    -- 1. Table: products
    -- Generic Info
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='version') THEN
        ALTER TABLE products ADD COLUMN version BIGINT DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='ingredients') THEN
        ALTER TABLE products ADD COLUMN ingredients TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='is_parent') THEN
        ALTER TABLE products ADD COLUMN is_parent BOOLEAN DEFAULT FALSE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='is_master') THEN
        ALTER TABLE products ADD COLUMN is_master BOOLEAN DEFAULT FALSE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='is_planning_set') THEN
        ALTER TABLE products ADD COLUMN is_planning_set BOOLEAN DEFAULT FALSE;
    END IF;

    -- Shelf Life and Specs
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='opened_shelf_life_months') THEN
        ALTER TABLE products ADD COLUMN opened_shelf_life_months INTEGER;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='capacity_fl_oz') THEN
        ALTER TABLE products ADD COLUMN capacity_fl_oz DOUBLE PRECISION;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='weight_oz') THEN
        ALTER TABLE products ADD COLUMN weight_oz DOUBLE PRECISION;
    END IF;

    -- Dimensions Status (CRITICAL for search results)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='status') THEN
        ALTER TABLE products ADD COLUMN status VARCHAR(255) DEFAULT '가안';
    END IF;

    -- 2. Table: users
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='name') THEN
        ALTER TABLE users ADD COLUMN name VARCHAR(255);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='company_name') THEN
        ALTER TABLE users ADD COLUMN company_name VARCHAR(255);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='department') THEN
        ALTER TABLE users ADD COLUMN department VARCHAR(255);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='failed_attempts') THEN
        ALTER TABLE users ADD COLUMN failed_attempts INTEGER DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='locked') THEN
        ALTER TABLE users ADD COLUMN locked BOOLEAN DEFAULT FALSE;
    END IF;

    -- 3. Table: roles (Expansion)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='roles' AND column_name='allowed_menus') THEN
        ALTER TABLE roles ADD COLUMN allowed_menus TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='roles' AND column_name='allowed_permissions') THEN
        ALTER TABLE roles ADD COLUMN allowed_permissions TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='roles' AND column_name='dashboard_layout_id') THEN
        ALTER TABLE roles ADD COLUMN dashboard_layout_id BIGINT;
    END IF;

END $$;
