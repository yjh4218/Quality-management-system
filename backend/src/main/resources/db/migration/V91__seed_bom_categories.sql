-- V91__seed_bom_categories.sql
-- Seed standard BOM categories (H2 and PostgreSQL compatible)

INSERT INTO bom_categories (main_type, sub_type, active, created_at, updated_at, updated_by)
SELECT '용기', 'PET병', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'SYSTEM'
WHERE NOT EXISTS (SELECT 1 FROM bom_categories WHERE main_type = '용기' AND sub_type = 'PET병');

INSERT INTO bom_categories (main_type, sub_type, active, created_at, updated_at, updated_by)
SELECT '용기', '초자(유리)', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'SYSTEM'
WHERE NOT EXISTS (SELECT 1 FROM bom_categories WHERE main_type = '용기' AND sub_type = '초자(유리)');

INSERT INTO bom_categories (main_type, sub_type, active, created_at, updated_at, updated_by)
SELECT '용기', '알루미늄 튜브', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'SYSTEM'
WHERE NOT EXISTS (SELECT 1 FROM bom_categories WHERE main_type = '용기' AND sub_type = '알루미늄 튜브');

INSERT INTO bom_categories (main_type, sub_type, active, created_at, updated_at, updated_by)
SELECT '용기', 'PP용기', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'SYSTEM'
WHERE NOT EXISTS (SELECT 1 FROM bom_categories WHERE main_type = '용기' AND sub_type = 'PP용기');

INSERT INTO bom_categories (main_type, sub_type, active, created_at, updated_at, updated_by)
SELECT '용기', '파우치', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'SYSTEM'
WHERE NOT EXISTS (SELECT 1 FROM bom_categories WHERE main_type = '용기' AND sub_type = '파우치');

INSERT INTO bom_categories (main_type, sub_type, active, created_at, updated_at, updated_by)
SELECT '용기', '합성수지 용기(헤비브로우, 트레이)', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'SYSTEM'
WHERE NOT EXISTS (SELECT 1 FROM bom_categories WHERE main_type = '용기' AND sub_type = '합성수지 용기(헤비브로우, 트레이)');

INSERT INTO bom_categories (main_type, sub_type, active, created_at, updated_at, updated_by)
SELECT '용기', '기타 용기', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'SYSTEM'
WHERE NOT EXISTS (SELECT 1 FROM bom_categories WHERE main_type = '용기' AND sub_type = '기타 용기');

INSERT INTO bom_categories (main_type, sub_type, active, created_at, updated_at, updated_by)
SELECT '캡·펌프', '원터치캡', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'SYSTEM'
WHERE NOT EXISTS (SELECT 1 FROM bom_categories WHERE main_type = '캡·펌프' AND sub_type = '원터치캡');

INSERT INTO bom_categories (main_type, sub_type, active, created_at, updated_at, updated_by)
SELECT '캡·펌프', '막캡(스크류캡)', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'SYSTEM'
WHERE NOT EXISTS (SELECT 1 FROM bom_categories WHERE main_type = '캡·펌프' AND sub_type = '막캡(스크류캡)');

INSERT INTO bom_categories (main_type, sub_type, active, created_at, updated_at, updated_by)
SELECT '캡·펌프', '일자 캡', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'SYSTEM'
WHERE NOT EXISTS (SELECT 1 FROM bom_categories WHERE main_type = '캡·펌프' AND sub_type = '일자 캡');

INSERT INTO bom_categories (main_type, sub_type, active, created_at, updated_at, updated_by)
SELECT '캡·펌프', '미스트 펌프', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'SYSTEM'
WHERE NOT EXISTS (SELECT 1 FROM bom_categories WHERE main_type = '캡·펌프' AND sub_type = '미스트 펌프');

INSERT INTO bom_categories (main_type, sub_type, active, created_at, updated_at, updated_by)
SELECT '캡·펌프', '로션 펌프', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'SYSTEM'
WHERE NOT EXISTS (SELECT 1 FROM bom_categories WHERE main_type = '캡·펌프' AND sub_type = '로션 펌프');

INSERT INTO bom_categories (main_type, sub_type, active, created_at, updated_at, updated_by)
SELECT '캡·펌프', '스포이드(드로퍼)', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'SYSTEM'
WHERE NOT EXISTS (SELECT 1 FROM bom_categories WHERE main_type = '캡·펌프' AND sub_type = '스포이드(드로퍼)');

INSERT INTO bom_categories (main_type, sub_type, active, created_at, updated_at, updated_by)
SELECT '캡·펌프', '기타 캡/펌프', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'SYSTEM'
WHERE NOT EXISTS (SELECT 1 FROM bom_categories WHERE main_type = '캡·펌프' AND sub_type = '기타 캡/펌프');

INSERT INTO bom_categories (main_type, sub_type, active, created_at, updated_at, updated_by)
SELECT '단상자·라벨', 'CCP 단상자', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'SYSTEM'
WHERE NOT EXISTS (SELECT 1 FROM bom_categories WHERE main_type = '단상자·라벨' AND sub_type = 'CCP 단상자');

INSERT INTO bom_categories (main_type, sub_type, active, created_at, updated_at, updated_by)
SELECT '단상자·라벨', '일반 종이 단상자', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'SYSTEM'
WHERE NOT EXISTS (SELECT 1 FROM bom_categories WHERE main_type = '단상자·라벨' AND sub_type = '일반 종이 단상자');

INSERT INTO bom_categories (main_type, sub_type, active, created_at, updated_at, updated_by)
SELECT '단상자·라벨', '방수 라벨(PP/PET)', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'SYSTEM'
WHERE NOT EXISTS (SELECT 1 FROM bom_categories WHERE main_type = '단상자·라벨' AND sub_type = '방수 라벨(PP/PET)');

INSERT INTO bom_categories (main_type, sub_type, active, created_at, updated_at, updated_by)
SELECT '단상자·라벨', '은박 라벨', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'SYSTEM'
WHERE NOT EXISTS (SELECT 1 FROM bom_categories WHERE main_type = '단상자·라벨' AND sub_type = '은박 라벨');

INSERT INTO bom_categories (main_type, sub_type, active, created_at, updated_at, updated_by)
SELECT '단상자·라벨', '수축 필름(수축라벨)', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'SYSTEM'
WHERE NOT EXISTS (SELECT 1 FROM bom_categories WHERE main_type = '단상자·라벨' AND sub_type = '수축 필름(수축라벨)');

INSERT INTO bom_categories (main_type, sub_type, active, created_at, updated_at, updated_by)
SELECT '단상자·라벨', '봉합 라벨', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'SYSTEM'
WHERE NOT EXISTS (SELECT 1 FROM bom_categories WHERE main_type = '단상자·라벨' AND sub_type = '봉합 라벨');

INSERT INTO bom_categories (main_type, sub_type, active, created_at, updated_at, updated_by)
SELECT '단상자·라벨', '기타 단상자/라벨', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'SYSTEM'
WHERE NOT EXISTS (SELECT 1 FROM bom_categories WHERE main_type = '단상자·라벨' AND sub_type = '기타 단상자/라벨');

INSERT INTO bom_categories (main_type, sub_type, active, created_at, updated_at, updated_by)
SELECT '인박스·아웃박스', '인박스(골판지)', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'SYSTEM'
WHERE NOT EXISTS (SELECT 1 FROM bom_categories WHERE main_type = '인박스·아웃박스' AND sub_type = '인박스(골판지)');

INSERT INTO bom_categories (main_type, sub_type, active, created_at, updated_at, updated_by)
SELECT '인박스·아웃박스', '아웃박스(골판지)', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'SYSTEM'
WHERE NOT EXISTS (SELECT 1 FROM bom_categories WHERE main_type = '인박스·아웃박스' AND sub_type = '아웃박스(골판지)');

INSERT INTO bom_categories (main_type, sub_type, active, created_at, updated_at, updated_by)
SELECT '인박스·아웃박스', '간지/패드', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'SYSTEM'
WHERE NOT EXISTS (SELECT 1 FROM bom_categories WHERE main_type = '인박스·아웃박스' AND sub_type = '간지/패드');

INSERT INTO bom_categories (main_type, sub_type, active, created_at, updated_at, updated_by)
SELECT '인박스·아웃박스', '에어캡/완충재', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'SYSTEM'
WHERE NOT EXISTS (SELECT 1 FROM bom_categories WHERE main_type = '인박스·아웃박스' AND sub_type = '에어캡/완충재');

INSERT INTO bom_categories (main_type, sub_type, active, created_at, updated_at, updated_by)
SELECT '인박스·아웃박스', '테이프/밴딩', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'SYSTEM'
WHERE NOT EXISTS (SELECT 1 FROM bom_categories WHERE main_type = '인박스·아웃박스' AND sub_type = '테이프/밴딩');

INSERT INTO bom_categories (main_type, sub_type, active, created_at, updated_at, updated_by)
SELECT '인박스·아웃박스', '기타 포장박스', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'SYSTEM'
WHERE NOT EXISTS (SELECT 1 FROM bom_categories WHERE main_type = '인박스·아웃박스' AND sub_type = '기타 포장박스');

INSERT INTO bom_categories (main_type, sub_type, active, created_at, updated_at, updated_by)
SELECT '부속품', '스푼/스파츌라', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'SYSTEM'
WHERE NOT EXISTS (SELECT 1 FROM bom_categories WHERE main_type = '부속품' AND sub_type = '스푼/스파츌라');

INSERT INTO bom_categories (main_type, sub_type, active, created_at, updated_at, updated_by)
SELECT '부속품', '실링지', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'SYSTEM'
WHERE NOT EXISTS (SELECT 1 FROM bom_categories WHERE main_type = '부속품' AND sub_type = '실링지');

INSERT INTO bom_categories (main_type, sub_type, active, created_at, updated_at, updated_by)
SELECT '부속품', '박킹', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'SYSTEM'
WHERE NOT EXISTS (SELECT 1 FROM bom_categories WHERE main_type = '부속품' AND sub_type = '박킹');

INSERT INTO bom_categories (main_type, sub_type, active, created_at, updated_at, updated_by)
SELECT '부속품', '리드/속뚜껑', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'SYSTEM'
WHERE NOT EXISTS (SELECT 1 FROM bom_categories WHERE main_type = '부속품' AND sub_type = '리드/속뚜껑');

INSERT INTO bom_categories (main_type, sub_type, active, created_at, updated_at, updated_by)
SELECT '부속품', '도구가이드/설명서', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'SYSTEM'
WHERE NOT EXISTS (SELECT 1 FROM bom_categories WHERE main_type = '부속품' AND sub_type = '도구가이드/설명서');

INSERT INTO bom_categories (main_type, sub_type, active, created_at, updated_at, updated_by)
SELECT '부속품', '기타 부속품', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'SYSTEM'
WHERE NOT EXISTS (SELECT 1 FROM bom_categories WHERE main_type = '부속품' AND sub_type = '기타 부속품');
