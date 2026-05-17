-- V31: Align regulatory_ingredients columns with JPA Entity specifications
-- 1. Ensure 'last_updated' column exists to prevent JPA mapping SQL grammar exception
ALTER TABLE regulatory_ingredients ADD COLUMN IF NOT EXISTS last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- 2. Drop the redundant 'updated_at' column to keep schema clean
ALTER TABLE regulatory_ingredients DROP COLUMN IF EXISTS updated_at;
