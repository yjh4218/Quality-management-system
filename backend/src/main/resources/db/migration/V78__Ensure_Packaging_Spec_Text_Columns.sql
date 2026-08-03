-- V78: Ensure TEXT type for all large packaging specification text fields
-- Compatible with both H2 and PostgreSQL

ALTER TABLE packaging_specifications ALTER COLUMN remarks TYPE TEXT;
ALTER TABLE packaging_specifications ALTER COLUMN packaging_method_text TYPE TEXT;
ALTER TABLE packaging_specifications ALTER COLUMN pallet_precautions TYPE TEXT;
ALTER TABLE packaging_specifications ALTER COLUMN container_marking_standard TYPE TEXT;
ALTER TABLE packaging_specifications ALTER COLUMN unit_box_marking_standard TYPE TEXT;
ALTER TABLE packaging_specifications ALTER COLUMN marking_standard TYPE TEXT;
