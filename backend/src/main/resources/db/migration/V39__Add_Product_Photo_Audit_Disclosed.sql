-- V39__Add_Product_Photo_Audit_Disclosed.sql
ALTER TABLE products ADD COLUMN IF NOT EXISTS photo_audit_disclosed BOOLEAN DEFAULT FALSE;
