-- V90__add_label_marking_rules_to_packaging_spec.sql
-- Add missing label marking rule columns to packaging_specifications

ALTER TABLE packaging_specifications ADD COLUMN IF NOT EXISTS inbox_label_marking_rule TEXT;
ALTER TABLE packaging_specifications ADD COLUMN IF NOT EXISTS outbox_label_marking_rule TEXT;
ALTER TABLE packaging_specifications ADD COLUMN IF NOT EXISTS pallet_label_marking_rule TEXT;
