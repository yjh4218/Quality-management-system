-- V73: 채널이 지정되지 않은 기존 품목들에 대해 등록된 sales_channels 중 1개를 무작위 매핑 후 제품명_채널코드 접미사 업데이트

-- 1. 채널 연결이 없는 products에 대해 sales_channels 중 1개 무작위 매핑 (PostgreSQL & H2 호환)
INSERT INTO product_sales_channels (product_id, channel_id)
SELECT p.id, (SELECT sc.id FROM sales_channels sc ORDER BY sc.id ASC LIMIT 1)
FROM products p
WHERE NOT EXISTS (SELECT 1 FROM product_sales_channels psc WHERE psc.product_id = p.id);

-- 2. 매핑된 sales_channels의 channel_code 기반으로 product_name 업데이트 (접미사 미포함 품목 대상)
UPDATE products p
SET product_name = p.product_name || '_' || (
    SELECT sc.channel_code 
    FROM product_sales_channels psc 
    JOIN sales_channels sc ON psc.channel_id = sc.id 
    WHERE psc.product_id = p.id 
    LIMIT 1
)
WHERE EXISTS (SELECT 1 FROM product_sales_channels psc WHERE psc.product_id = p.id)
  AND POSITION('_' IN p.product_name) = 0;

-- 3. 클레임(claims) 테이블의 product_name 동기화
UPDATE claims
SET product_name = (
    SELECT p.product_name 
    FROM products p 
    WHERE p.item_code = claims.item_code 
      AND (p.is_deleted = false OR p.is_deleted IS NULL) 
    LIMIT 1
)
WHERE EXISTS (
    SELECT 1 FROM products p 
    WHERE p.item_code = claims.item_code 
      AND (p.is_deleted = false OR p.is_deleted IS NULL)
)
AND claims.product_name IS DISTINCT FROM (
    SELECT p.product_name 
    FROM products p 
    WHERE p.item_code = claims.item_code 
      AND (p.is_deleted = false OR p.is_deleted IS NULL) 
    LIMIT 1
);
