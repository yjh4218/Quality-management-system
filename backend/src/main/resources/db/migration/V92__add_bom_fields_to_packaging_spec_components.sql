-- V92__add_bom_fields_to_packaging_spec_components.sql
-- Add bom_code and weight columns to packaging_spec_components table (ANSI standard compatible)

ALTER TABLE packaging_spec_components ADD COLUMN IF NOT EXISTS bom_code VARCHAR(255);
ALTER TABLE packaging_spec_components ADD COLUMN IF NOT EXISTS weight DOUBLE PRECISION;
