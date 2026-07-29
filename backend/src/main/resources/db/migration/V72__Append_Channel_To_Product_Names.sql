-- V72: 제품명 뒤에 채널 정보 기반 '_채널명' (예: '_JP/OFF') 접미사 업데이트
-- 1. 매핑된 sales_channels가 있는 제품들에 대해 product_name에 '_채널코드' 접미사 결합
UPDATE products p
SET product_name = p.product_name || '_' || sc.channel_code
FROM product_sales_channels psc
JOIN sales_channels sc ON psc.channel_id = sc.id
WHERE p.id = psc.product_id
  AND p.product_name NOT LIKE '%@_%' ESCAPE '@'
  AND p.product_name NOT LIKE '%\_%' ESCAPE '\'
  AND POSITION('_' IN p.product_name) = 0;

-- 2. 아직 채널이 지정되지 않았거나 기본 제품인 경우 디폴트 '_JP/OFF' 접미사 보정 (기존 제품명에 '_'가 없는 경우)
UPDATE products
SET product_name = product_name || '_JP/OFF'
WHERE POSITION('_' IN product_name) = 0
  AND product_name IS NOT NULL
  AND product_name <> '';
