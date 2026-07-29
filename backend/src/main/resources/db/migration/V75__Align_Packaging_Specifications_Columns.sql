-- V75: Align packaging_specifications column types to TEXT for large payload support
-- ANSI SQL compatible for both H2 and PostgreSQL

ALTER TABLE packaging_specifications ALTER COLUMN remarks TYPE TEXT;
ALTER TABLE packaging_specifications ALTER COLUMN packaging_method_text TYPE TEXT;
ALTER TABLE packaging_specifications ALTER COLUMN pallet_precautions TYPE TEXT;
ALTER TABLE packaging_specifications ALTER COLUMN approval_chain_json TYPE TEXT;
