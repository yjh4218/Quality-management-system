-- [MIGRATION] Final repair for TEXT mapping issues
-- Forces all large text columns to be TEXT type.
-- H2 compatible: Direct ALTER COLUMN TYPE without USING clause.

-- 1. audit_logs
ALTER TABLE audit_logs ALTER COLUMN description TYPE TEXT;
ALTER TABLE audit_logs ALTER COLUMN old_value TYPE TEXT;
ALTER TABLE audit_logs ALTER COLUMN new_value TYPE TEXT;

-- 2. product_history
ALTER TABLE product_history ALTER COLUMN old_value TYPE TEXT;
ALTER TABLE product_history ALTER COLUMN new_value TYPE TEXT;

-- 3. claim_history
ALTER TABLE claim_history ALTER COLUMN old_value TYPE TEXT;
ALTER TABLE claim_history ALTER COLUMN new_value TYPE TEXT;

-- 4. claims (various TEXT fields)
ALTER TABLE claims ALTER COLUMN claim_content TYPE TEXT;
ALTER TABLE claims ALTER COLUMN root_cause_analysis TYPE TEXT;
ALTER TABLE claims ALTER COLUMN preventative_action TYPE TEXT;
ALTER TABLE claims ALTER COLUMN mfr_root_cause_analysis TYPE TEXT;
ALTER TABLE claims ALTER COLUMN mfr_preventative_action TYPE TEXT;
ALTER TABLE claims ALTER COLUMN quality_remarks TYPE TEXT;
ALTER TABLE claims ALTER COLUMN mfr_remarks TYPE TEXT;

-- 5. products (ingredients summary)
ALTER TABLE products ALTER COLUMN ingredients TYPE TEXT;
