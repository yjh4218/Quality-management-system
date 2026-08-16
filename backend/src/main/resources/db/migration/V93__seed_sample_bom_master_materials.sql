-- V93__seed_sample_bom_master_materials.sql
-- Seed standard sample BOM packaging materials (H2 and PostgreSQL compatible)

-- [1] 250mL PET 용기 기준 부자재 풀
INSERT INTO master_packaging_materials (bom_code, component_name, type, detailed_type, detailed_material, material, weight, thickness, specification, manufacturer, is_multi_layer, created_at)
SELECT 'MAT-CNT-0001', '250mL 투명 PET 원형 보틀', '용기', 'PET병', 'PET (단일수지)', 'PET', 28.5, 350.0, 'Ø55 × 145mm (24/410)', '(주)삼화패키징', false, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM master_packaging_materials WHERE bom_code = 'MAT-CNT-0001');

INSERT INTO master_packaging_materials (bom_code, component_name, type, detailed_type, detailed_material, material, weight, thickness, specification, manufacturer, is_multi_layer, created_at)
SELECT 'MAT-CAP-0001', '24파이 플립 원터치캡 (화이트)', '캡·펌프', '원터치캡', 'PP (단일수지)', 'PP', 4.2, 200.0, '24/410 Ø27 × 22mm', '(주)우성플라테크', false, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM master_packaging_materials WHERE bom_code = 'MAT-CAP-0001');

INSERT INTO master_packaging_materials (bom_code, component_name, type, detailed_type, detailed_material, material, weight, thickness, specification, manufacturer, is_multi_layer, created_at)
SELECT 'MAT-BOX-0001', '250mL 원형용기 단상자 CCP 350g', '단상자·라벨', '단상자(CCP)', 'CCP 350g/m²', 'CCP', 18.0, 400.0, '58 × 58 × 150mm', '(주)신우지앤피', false, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM master_packaging_materials WHERE bom_code = 'MAT-BOX-0001');

INSERT INTO master_packaging_materials (bom_code, component_name, type, detailed_type, detailed_material, material, weight, thickness, specification, manufacturer, is_multi_layer, created_at)
SELECT 'MAT-BOX-0002', '250mL 보틀 전면 방수 유포지 라벨', '단상자·라벨', '수축/점착 라벨', 'PP 유포지 (방수코팅)', 'PP 유포지', 1.2, 50.0, '120 × 90mm', '태양라벨인쇄', false, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM master_packaging_materials WHERE bom_code = 'MAT-BOX-0002');

INSERT INTO master_packaging_materials (bom_code, component_name, type, detailed_type, detailed_material, material, weight, thickness, specification, manufacturer, is_multi_layer, created_at)
SELECT 'MAT-SHP-0001', '250mL 10구 골판지 인박스', '인박스·아웃박스', '인박스(골판지)', 'E골(골판지)', '골판지', 85.0, 1500.0, '295 × 120 × 155mm', '(주)대양제지', false, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM master_packaging_materials WHERE bom_code = 'MAT-SHP-0001');

INSERT INTO master_packaging_materials (bom_code, component_name, type, detailed_type, detailed_material, material, weight, thickness, specification, manufacturer, is_multi_layer, created_at)
SELECT 'MAT-SHP-0002', '250mL 40개입 표준 골판지 아웃박스', '인박스·아웃박스', '아웃박스(골판지)', 'A골(골판지 DW)', '골판지', 420.0, 4500.0, '605 × 255 × 325mm', '(주)대양제지', false, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM master_packaging_materials WHERE bom_code = 'MAT-SHP-0002');

-- [2] 30mL 초자 유리병 스포이드 세럼 기준 부자재 풀
INSERT INTO master_packaging_materials (bom_code, component_name, type, detailed_type, detailed_material, material, weight, thickness, specification, manufacturer, is_multi_layer, created_at)
SELECT 'MAT-CNT-0002', '30mL 앰플용 초자 유리병 (투명)', '용기', '초자(유리)', '유리(Glass)', '유리', 62.0, 1200.0, 'Ø38 × 78mm (18/415)', '(주)연우패키지', false, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM master_packaging_materials WHERE bom_code = 'MAT-CNT-0002');

INSERT INTO master_packaging_materials (bom_code, component_name, type, detailed_type, detailed_material, material, weight, thickness, specification, manufacturer, is_multi_layer, created_at)
SELECT 'MAT-CAP-0002', '18파이 NBR 고무 스포이드 캡', '캡·펌프', '스포이드(드로퍼)', 'PP + NBR 고무 + 유리관 (복합재질)', '복합재질', 8.5, 300.0, '18/415 Ø22 × 82mm', '(주)진코스텍', false, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM master_packaging_materials WHERE bom_code = 'MAT-CAP-0002');

INSERT INTO master_packaging_materials (bom_code, component_name, type, detailed_type, detailed_material, material, weight, thickness, specification, manufacturer, is_multi_layer, created_at)
SELECT 'MAT-BOX-0003', '30mL 앰플 단상자 로얄아이보리 350g', '단상자·라벨', '단상자(RIV)', 'RIV 350g/m²', 'RIV', 12.5, 380.0, '42 × 42 × 85mm', '(주)신우지앤피', false, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM master_packaging_materials WHERE bom_code = 'MAT-BOX-0003');

INSERT INTO master_packaging_materials (bom_code, component_name, type, detailed_type, detailed_material, material, weight, thickness, specification, manufacturer, is_multi_layer, created_at)
SELECT 'MAT-BOX-0004', '30mL 앰플 배면 투명 라벨', '단상자·라벨', '수축/점착 라벨', '투명 PET지', 'PET', 0.6, 30.0, '80 × 45mm', '태양라벨인쇄', false, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM master_packaging_materials WHERE bom_code = 'MAT-BOX-0004');

INSERT INTO master_packaging_materials (bom_code, component_name, type, detailed_type, detailed_material, material, weight, thickness, specification, manufacturer, is_multi_layer, created_at)
SELECT 'MAT-SHP-0003', '30mL 50개입 완충 일체형 아웃박스', '인박스·아웃박스', '아웃박스(골판지)', 'B골(골판지 SW)', '골판지', 280.0, 3000.0, '440 × 225 × 190mm', '(주)대양제지', false, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM master_packaging_materials WHERE bom_code = 'MAT-SHP-0003');

-- [3] 공용 부속품(완충재 / 방습제)
INSERT INTO master_packaging_materials (bom_code, component_name, type, detailed_type, detailed_material, material, weight, thickness, specification, manufacturer, is_multi_layer, created_at)
SELECT 'MAT-ETC-0001', 'PE 에어캡 완충 패드', '부속품', '완충재(에어캡, 패드)', 'LDPE', 'LDPE', 6.5, 80.0, '300 × 300mm 2겹', '(주)에어플러스', false, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM master_packaging_materials WHERE bom_code = 'MAT-ETC-0001');

INSERT INTO master_packaging_materials (bom_code, component_name, type, detailed_type, detailed_material, material, weight, thickness, specification, manufacturer, is_multi_layer, created_at)
SELECT 'MAT-ETC-0002', '실리카겔 방습제 1g', '부속품', '기타 부속품', '실리카겔 / 부직포', '실리카겔', 1.0, 100.0, '40 × 30mm', '(주)데시칸트코리아', false, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM master_packaging_materials WHERE bom_code = 'MAT-ETC-0002');
