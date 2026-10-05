-- V125: 제품/상품 도메인 동적 화면의 누락된 API 엔드포인트 자동 정합성 동기화
UPDATE dynamic_screen 
SET api_endpoint = '/api/products' 
WHERE (api_endpoint IS NULL OR api_endpoint = '' OR api_endpoint = '/api/')
  AND (screen_code LIKE '%PROD%' OR screen_code LIKE '%TEST_EXT%' OR screen_name LIKE '%제품%' OR screen_name LIKE '%상품%');
