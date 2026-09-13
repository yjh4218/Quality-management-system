-- V105: QMS 주요 검색 컬럼 B-Tree 인덱스 추가 (H2 & PostgreSQL 교차 호환)
-- 주요 엔티티(제품, 클레임, 제조사, 공지사항, 규제성분)의 고속 검색 지원

-- 1. 제품(Products) 검색 인덱스
CREATE INDEX IF NOT EXISTS idx_products_product_name ON products(product_name);
CREATE INDEX IF NOT EXISTS idx_products_item_code ON products(item_code);

-- 2. 클레임(Claims) 검색 인덱스
CREATE INDEX IF NOT EXISTS idx_claims_product_name ON claims(product_name);
CREATE INDEX IF NOT EXISTS idx_claims_claim_number ON claims(claim_number);

-- 3. 제조사(Manufacturers) 검색 인덱스
CREATE INDEX IF NOT EXISTS idx_manufacturers_name ON manufacturers(name);

-- 4. 공지사항(Announcements) 검색 인덱스
CREATE INDEX IF NOT EXISTS idx_announcements_title ON announcements(title);
CREATE INDEX IF NOT EXISTS idx_announcements_number ON announcements(announcement_number);

-- 5. 규제 성분(Regulatory Ingredients) 검색 인덱스
CREATE INDEX IF NOT EXISTS idx_reg_ingr_korean_name ON regulatory_ingredients(korean_name);
CREATE INDEX IF NOT EXISTS idx_reg_ingr_inci_name ON regulatory_ingredients(inci_name);
