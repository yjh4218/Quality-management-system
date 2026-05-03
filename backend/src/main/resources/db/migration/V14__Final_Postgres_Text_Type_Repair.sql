-- [MIGRATION] Final repair for PostgreSQL TEXT mapping issues
-- Forces all large text columns to be TEXT type instead of BYTEA.

DO $$ 
BEGIN 
    -- 1. audit_logs
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='audit_logs') THEN
        ALTER TABLE audit_logs ALTER COLUMN description TYPE TEXT USING description::TEXT;
        ALTER TABLE audit_logs ALTER COLUMN old_value TYPE TEXT USING old_value::TEXT;
        ALTER TABLE audit_logs ALTER COLUMN new_value TYPE TEXT USING new_value::TEXT;
    END IF;

    -- 2. product_history
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='product_history') THEN
        ALTER TABLE product_history ALTER COLUMN old_value TYPE TEXT USING old_value::TEXT;
        ALTER TABLE product_history ALTER COLUMN new_value TYPE TEXT USING new_value::TEXT;
    END IF;

    -- 3. claim_history
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='claim_history') THEN
        ALTER TABLE claim_history ALTER COLUMN old_value TYPE TEXT USING old_value::TEXT;
        ALTER TABLE claim_history ALTER COLUMN new_value TYPE TEXT USING new_value::TEXT;
    END IF;

    -- 4. claims (various TEXT fields)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='claims') THEN
        ALTER TABLE claims ALTER COLUMN claim_content TYPE TEXT USING claim_content::TEXT;
        ALTER TABLE claims ALTER COLUMN root_cause_analysis TYPE TEXT USING root_cause_analysis::TEXT;
        ALTER TABLE claims ALTER COLUMN preventative_action TYPE TEXT USING preventative_action::TEXT;
        ALTER TABLE claims ALTER COLUMN mfr_root_cause_analysis TYPE TEXT USING mfr_root_cause_analysis::TEXT;
        ALTER TABLE claims ALTER COLUMN mfr_preventative_action TYPE TEXT USING mfr_preventative_action::TEXT;
        ALTER TABLE claims ALTER COLUMN quality_remarks TYPE TEXT USING quality_remarks::TEXT;
        ALTER TABLE claims ALTER COLUMN mfr_remarks TYPE TEXT USING mfr_remarks::TEXT;
    END IF;

    -- 5. products (ingredients summary)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='products') THEN
        ALTER TABLE products ALTER COLUMN ingredients TYPE TEXT USING ingredients::TEXT;
    END IF;

END $$;
