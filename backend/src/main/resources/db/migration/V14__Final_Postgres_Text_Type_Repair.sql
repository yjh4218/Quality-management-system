-- [MIGRATION] Final repair for TEXT mapping issues
-- Forces all large text columns to be TEXT type.
-- H2 & Postgres compatible: Ensures column exists before ALTER COLUMN TYPE.

-- 1. audit_logs
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS old_value TEXT;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS new_value TEXT;

-- 2. product_history
ALTER TABLE product_history ADD COLUMN IF NOT EXISTS old_value TEXT;
ALTER TABLE product_history ADD COLUMN IF NOT EXISTS new_value TEXT;

-- 3. claim_history
ALTER TABLE claim_history ADD COLUMN IF NOT EXISTS old_value TEXT;
ALTER TABLE claim_history ADD COLUMN IF NOT EXISTS new_value TEXT;

-- 4. claims (various TEXT fields)
ALTER TABLE claims ADD COLUMN IF NOT EXISTS claim_content TEXT;
ALTER TABLE claims ADD COLUMN IF NOT EXISTS root_cause_analysis TEXT;
ALTER TABLE claims ADD COLUMN IF NOT EXISTS preventative_action TEXT;
ALTER TABLE claims ADD COLUMN IF NOT EXISTS mfr_root_cause_analysis TEXT;
ALTER TABLE claims ADD COLUMN IF NOT EXISTS mfr_preventative_action TEXT;
ALTER TABLE claims ADD COLUMN IF NOT EXISTS quality_remarks TEXT;
ALTER TABLE claims ADD COLUMN IF NOT EXISTS mfr_remarks TEXT;

-- 5. products (ingredients summary)
ALTER TABLE products ADD COLUMN IF NOT EXISTS ingredients TEXT;

-- Type enforcement
ALTER TABLE audit_logs ALTER COLUMN description TYPE TEXT;
ALTER TABLE audit_logs ALTER COLUMN old_value TYPE TEXT;
ALTER TABLE audit_logs ALTER COLUMN new_value TYPE TEXT;

ALTER TABLE product_history ALTER COLUMN old_value TYPE TEXT;
ALTER TABLE product_history ALTER COLUMN new_value TYPE TEXT;

ALTER TABLE claim_history ALTER COLUMN old_value TYPE TEXT;
ALTER TABLE claim_history ALTER COLUMN new_value TYPE TEXT;

ALTER TABLE claims ALTER COLUMN claim_content TYPE TEXT;
ALTER TABLE claims ALTER COLUMN root_cause_analysis TYPE TEXT;
ALTER TABLE claims ALTER COLUMN preventative_action TYPE TEXT;
ALTER TABLE claims ALTER COLUMN mfr_root_cause_analysis TYPE TEXT;
ALTER TABLE claims ALTER COLUMN mfr_preventative_action TYPE TEXT;
ALTER TABLE claims ALTER COLUMN quality_remarks TYPE TEXT;
ALTER TABLE claims ALTER COLUMN mfr_remarks TYPE TEXT;

ALTER TABLE products ALTER COLUMN ingredients TYPE TEXT;
