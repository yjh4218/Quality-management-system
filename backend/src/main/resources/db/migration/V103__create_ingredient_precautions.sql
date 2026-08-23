-- V103: Create ingredient_precaution_rules table and seed initial regulatory warning data

CREATE TABLE IF NOT EXISTS ingredient_precaution_rules (
    id BIGSERIAL PRIMARY KEY,
    ingredient_name_kr VARCHAR(500) NOT NULL,
    ingredient_name_en VARCHAR(500),
    cas_number VARCHAR(100),
    operator VARCHAR(20) NOT NULL DEFAULT 'GTE', -- GTE, GT, LTE, LT, EQ, ALWAYS
    threshold_percent DOUBLE PRECISION,
    threshold_ppm DOUBLE PRECISION,
    product_category VARCHAR(100) DEFAULT 'ALL', -- ALL, LEAVE_ON, RINSE_OFF, SUNSCREEN, LIP, EYE
    precaution_type VARCHAR(100) NOT NULL,       -- MANDATORY_WARNING, ALLERGEN_LABEL, USAGE_LIMIT
    precaution_title VARCHAR(500) NOT NULL,
    precaution_content TEXT NOT NULL,
    regulation_source VARCHAR(500),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_prec_rule_name_kr ON ingredient_precaution_rules(ingredient_name_kr);
CREATE INDEX IF NOT EXISTS idx_prec_rule_name_en ON ingredient_precaution_rules(ingredient_name_en);

-- Initial Seed Data (ANSI SQL compatible without ON CONFLICT)

-- 1. AHA (Alpha Hydroxy Acid - 글라이콜릭애씨드, 락틱애씨드 등) 0.5% 초과
INSERT INTO ingredient_precaution_rules (
    ingredient_name_kr, ingredient_name_en, operator, threshold_percent, product_category, precaution_type, precaution_title, precaution_content, regulation_source
)
SELECT '글라이콜릭애씨드', 'Glycolic Acid', 'GT', 0.5, 'ALL', 'MANDATORY_WARNING', 'AHA(0.5% 초과) 사용상 주의사항 의무 기재', '1. 햇빛에 대한 피부의 감수성을 증가시킬 수 있으므로 자외선 차단제를 함께 사용할 것. 2. 일부에 시험 사용하여 피부 이상을 확인할 것.', '화장품법 시행규칙 [별표 3]'
WHERE NOT EXISTS (SELECT 1 FROM ingredient_precaution_rules WHERE ingredient_name_kr = '글라이콜릭애씨드' AND threshold_percent = 0.5);

INSERT INTO ingredient_precaution_rules (
    ingredient_name_kr, ingredient_name_en, operator, threshold_percent, product_category, precaution_type, precaution_title, precaution_content, regulation_source
)
SELECT '락틱애씨드', 'Lactic Acid', 'GT', 0.5, 'ALL', 'MANDATORY_WARNING', 'AHA(0.5% 초과) 사용상 주의사항 의무 기재', '1. 햇빛에 대한 피부의 감수성을 증가시킬 수 있으므로 자외선 차단제를 함께 사용할 것. 2. 일부에 시험 사용하여 피부 이상을 확인할 것.', '화장품법 시행규칙 [별표 3]'
WHERE NOT EXISTS (SELECT 1 FROM ingredient_precaution_rules WHERE ingredient_name_kr = '락틱애씨드' AND threshold_percent = 0.5);

INSERT INTO ingredient_precaution_rules (
    ingredient_name_kr, ingredient_name_en, operator, threshold_percent, product_category, precaution_type, precaution_title, precaution_content, regulation_source
)
SELECT '시트릭애씨드', 'Citric Acid', 'GT', 0.5, 'ALL', 'MANDATORY_WARNING', 'AHA(0.5% 초과) 사용상 주의사항 의무 기재', '1. 햇빛에 대한 피부의 감수성을 증가시킬 수 있으므로 자외선 차단제를 함께 사용할 것. 2. 일부에 시험 사용하여 피부 이상을 확인할 것.', '화장품법 시행규칙 [별표 3]'
WHERE NOT EXISTS (SELECT 1 FROM ingredient_precaution_rules WHERE ingredient_name_kr = '시트릭애씨드' AND threshold_percent = 0.5);

-- 2. BHA (살리실릭애씨드) 0.5% 이하 배합
INSERT INTO ingredient_precaution_rules (
    ingredient_name_kr, ingredient_name_en, operator, threshold_percent, product_category, precaution_type, precaution_title, precaution_content, regulation_source
)
SELECT '살리실릭애씨드', 'Salicylic Acid', 'ALWAYS', 0.0, 'ALL', 'MANDATORY_WARNING', '살리실산 및 그 염류 사용상 주의사항', '만 3세 이하 어린이에게는 사용하지 말 것(샴푸 등 사용 후 바로 씻어내는 두발용 제품류는 제외).', '화장품법 시행규칙 [별표 3]'
WHERE NOT EXISTS (SELECT 1 FROM ingredient_precaution_rules WHERE ingredient_name_kr = '살리실릭애씨드');

-- 3. 알부틴 (Arbutin) 2% 이상 배합 시
INSERT INTO ingredient_precaution_rules (
    ingredient_name_kr, ingredient_name_en, operator, threshold_percent, product_category, precaution_type, precaution_title, precaution_content, regulation_source
)
SELECT '알부틴', 'Arbutin', 'GTE', 2.0, 'ALL', 'MANDATORY_WARNING', '알부틴(2% 이상) 주의사항 기재', '「인체적용시험자료」에서 경미한 가려움이 보고된 바 있음.', '화장품법 시행규칙 [별표 3]'
WHERE NOT EXISTS (SELECT 1 FROM ingredient_precaution_rules WHERE ingredient_name_kr = '알부틴' AND threshold_percent = 2.0);

-- 4. 레티놀 (Retinol)
INSERT INTO ingredient_precaution_rules (
    ingredient_name_kr, ingredient_name_en, operator, threshold_percent, product_category, precaution_type, precaution_title, precaution_content, regulation_source
)
SELECT '레티놀', 'Retinol', 'ALWAYS', 0.0, 'ALL', 'MANDATORY_WARNING', '레티놀 배합 제품 사용상 주의사항', '처음 사용하는 경우 소량을 격일로 사용하여 피부 적응 기간을 거치고, 낮 동안 사용 시 자외선 차단제를 함께 바를 것.', '화장품 안전기준 등에 관한 규정'
WHERE NOT EXISTS (SELECT 1 FROM ingredient_precaution_rules WHERE ingredient_name_kr = '레티놀');

-- 5. 착향제 알레르기 유발물질 25종 (대표 성분)
INSERT INTO ingredient_precaution_rules (
    ingredient_name_kr, ingredient_name_en, operator, threshold_ppm, product_category, precaution_type, precaution_title, precaution_content, regulation_source
)
SELECT '리모넨', 'Limonene', 'GT', 10.0, 'LEAVE_ON', 'ALLERGEN_LABEL', '착향제 알레르기 유발성분 표시 의무', '씻어내지 않는 제품 기준 0.001%(10ppm) 초과 함유 시 국문 라벨에 해당 성분명을 반드시 별도 기재해야 합니다.', '화장품 표시·광고 실증을 위한 시험방법 가이드라인'
WHERE NOT EXISTS (SELECT 1 FROM ingredient_precaution_rules WHERE ingredient_name_kr = '리모넨');

INSERT INTO ingredient_precaution_rules (
    ingredient_name_kr, ingredient_name_en, operator, threshold_ppm, product_category, precaution_type, precaution_title, precaution_content, regulation_source
)
SELECT '리날룰', 'Linalool', 'GT', 10.0, 'LEAVE_ON', 'ALLERGEN_LABEL', '착향제 알레르기 유발성분 표시 의무', '씻어내지 않는 제품 기준 0.001%(10ppm) 초과 함유 시 국문 라벨에 해당 성분명을 반드시 별도 기재해야 합니다.', '화장품 표시·광고 실증을 위한 시험방법 가이드라인'
WHERE NOT EXISTS (SELECT 1 FROM ingredient_precaution_rules WHERE ingredient_name_kr = '리날룰');

INSERT INTO ingredient_precaution_rules (
    ingredient_name_kr, ingredient_name_en, operator, threshold_ppm, product_category, precaution_type, precaution_title, precaution_content, regulation_source
)
SELECT '시트로넬올', 'Citronellol', 'GT', 10.0, 'LEAVE_ON', 'ALLERGEN_LABEL', '착향제 알레르기 유발성분 표시 의무', '씻어내지 않는 제품 기준 0.001%(10ppm) 초과 함유 시 국문 라벨에 해당 성분명을 반드시 별도 기재해야 합니다.', '화장품 표시·광고 실증을 위한 시험방법 가이드라인'
WHERE NOT EXISTS (SELECT 1 FROM ingredient_precaution_rules WHERE ingredient_name_kr = '시트로넬올');

INSERT INTO ingredient_precaution_rules (
    ingredient_name_kr, ingredient_name_en, operator, threshold_ppm, product_category, precaution_type, precaution_title, precaution_content, regulation_source
)
SELECT '제라니올', 'Geraniol', 'GT', 10.0, 'LEAVE_ON', 'ALLERGEN_LABEL', '착향제 알레르기 유발성분 표시 의무', '씻어내지 않는 제품 기준 0.001%(10ppm) 초과 함유 시 국문 라벨에 해당 성분명을 반드시 별도 기재해야 합니다.', '화장품 표시·광고 실증을 위한 시험방법 가이드라인'
WHERE NOT EXISTS (SELECT 1 FROM ingredient_precaution_rules WHERE ingredient_name_kr = '제라니올');

INSERT INTO ingredient_precaution_rules (
    ingredient_name_kr, ingredient_name_en, operator, threshold_ppm, product_category, precaution_type, precaution_title, precaution_content, regulation_source
)
SELECT '시트랄', 'Citral', 'GT', 10.0, 'LEAVE_ON', 'ALLERGEN_LABEL', '착향제 알레르기 유발성분 표시 의무', '씻어내지 않는 제품 기준 0.001%(10ppm) 초과 함유 시 국문 라벨에 해당 성분명을 반드시 별도 기재해야 합니다.', '화장품 표시·광고 실증을 위한 시험방법 가이드라인'
WHERE NOT EXISTS (SELECT 1 FROM ingredient_precaution_rules WHERE ingredient_name_kr = '시트랄');

INSERT INTO ingredient_precaution_rules (
    ingredient_name_kr, ingredient_name_en, operator, threshold_ppm, product_category, precaution_type, precaution_title, precaution_content, regulation_source
)
SELECT '벤질알코올', 'Benzyl Alcohol', 'GT', 10.0, 'LEAVE_ON', 'ALLERGEN_LABEL', '착향제 알레르기 유발성분 표시 의무', '씻어내지 않는 제품 기준 0.001%(10ppm) 초과 함유 시 국문 라벨에 해당 성분명을 반드시 별도 기재해야 합니다.', '화장품 표시·광고 실증을 위한 시험방법 가이드라인'
WHERE NOT EXISTS (SELECT 1 FROM ingredient_precaution_rules WHERE ingredient_name_kr = '벤질알코올');
