-- V8: Create sequence for claim numbers
-- Ensures thread-safe unique claim numbers even with concurrent requests
CREATE SEQUENCE IF NOT EXISTS claim_number_seq START 1;
