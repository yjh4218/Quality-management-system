-- V32: Extend korean_name column size in regulatory_ingredients table to prevent 'value too long' SQLException
ALTER TABLE regulatory_ingredients ALTER COLUMN korean_name TYPE VARCHAR(2000);
