-- V100: Add POP packaging, air cap cushion, and pallet corner post fields to packaging_specifications
-- ANSI SQL compatible with both PostgreSQL and H2

ALTER TABLE packaging_specifications ADD COLUMN IF NOT EXISTS pop_use_yn VARCHAR(10) DEFAULT 'X';
ALTER TABLE packaging_specifications ADD COLUMN IF NOT EXISTS pop_height DOUBLE PRECISION DEFAULT 35.0;
ALTER TABLE packaging_specifications ADD COLUMN IF NOT EXISTS air_cap_use_yn VARCHAR(10) DEFAULT 'X';
ALTER TABLE packaging_specifications ADD COLUMN IF NOT EXISTS corner_post_use_yn VARCHAR(10) DEFAULT 'X';
