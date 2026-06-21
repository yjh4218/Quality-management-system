-- [MIGRATION] QMS Performance & Security Index Optimization
-- 1. Foreign Key B-Tree indexes to prevent full table scans on joins
CREATE INDEX IF NOT EXISTS idx_products_brand_id ON products(brand_id);
CREATE INDEX IF NOT EXISTS idx_products_manufacturer_id ON products(manufacturer_id);
CREATE INDEX IF NOT EXISTS idx_packaging_specs_product_id ON packaging_specifications(product_id);
CREATE INDEX IF NOT EXISTS idx_bom_items_spec_id ON packaging_spec_bom_items(packaging_spec_id);
CREATE INDEX IF NOT EXISTS idx_bom_items_master_id ON packaging_spec_bom_items(master_material_id);
CREATE INDEX IF NOT EXISTS idx_product_ingredients_product_id ON product_ingredients(product_id);

-- 2. Traceability index for Claims
CREATE INDEX IF NOT EXISTS idx_claims_lot_number ON claims(lot_number);

-- 3. PostgreSQL Partial Index for soft-delete active records
CREATE INDEX IF NOT EXISTS idx_active_products ON products (id) WHERE is_deleted = false AND active = true;

-- 4. Composite Index for Dashboard and Manufacturer Audit views
CREATE INDEX IF NOT EXISTS idx_prod_audit_mfr_status ON production_audit(manufacturer_name, status, upload_date DESC);
