-- V72: 제품명 뒤에 채널 정보 기반 '_채널명' (예: '_JP/OFF') 접미사 업데이트
-- 매핑된 sales_channels가 있는 제품들에 대해서만 product_name에 '_채널코드' 접미사 결합
UPDATE products p
SET product_name = p.product_name || '_' || sc.channel_code
FROM product_sales_channels psc
JOIN sales_channels sc ON psc.channel_id = sc.id
WHERE p.id = psc.product_id
  AND p.product_name NOT LIKE '%@_%' ESCAPE '@'
  AND p.product_name NOT LIKE '%\_%' ESCAPE '\'
  AND POSITION('_' IN p.product_name) = 0;

