-- V25: Clean up legacy invalid 10200.0 kg one_pallet_weight values in packaging_specifications
UPDATE packaging_specifications
SET one_pallet_weight = NULL
WHERE one_pallet_weight = '10200.0' OR one_pallet_weight = '10200';
