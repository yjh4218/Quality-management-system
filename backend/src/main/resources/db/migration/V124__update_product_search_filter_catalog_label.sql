-- V124: Update PRODUCT_NAME search field catalog label to '품목코드&제품명'
UPDATE search_field_catalog
SET label = '품목코드&제품명'
WHERE catalog_key = 'PRODUCT_NAME';
