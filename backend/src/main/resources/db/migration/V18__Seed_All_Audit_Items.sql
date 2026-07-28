-- V18: 모든 분류 및 점검항목에 세부항목 5개씩 시딩

-- 1. 나머지 분류들에 대해 점검항목 그룹 등록
-- (DO $$ FOR LOOP를 INSERT ... SELECT로 변환)
INSERT INTO audit_template_groups (template_id, group_name, display_order)
SELECT id, '운영관리', 1 FROM audit_templates WHERE classification_name != '화장품 제조사 Audit';
INSERT INTO audit_template_groups (template_id, group_name, display_order)
SELECT id, '위생관리', 2 FROM audit_templates WHERE classification_name != '화장품 제조사 Audit';
INSERT INTO audit_template_groups (template_id, group_name, display_order)
SELECT id, '공정관리', 3 FROM audit_templates WHERE classification_name != '화장품 제조사 Audit';
INSERT INTO audit_template_groups (template_id, group_name, display_order)
SELECT id, '품질관리', 4 FROM audit_templates WHERE classification_name != '화장품 제조사 Audit';
INSERT INTO audit_template_groups (template_id, group_name, display_order)
SELECT id, '교육관리', 5 FROM audit_templates WHERE classification_name != '화장품 제조사 Audit';
INSERT INTO audit_template_groups (template_id, group_name, display_order)
SELECT id, '클레임관리', 6 FROM audit_templates WHERE classification_name != '화장품 제조사 Audit';

-- 2. 모든 점검항목 그룹에 대해 세부항목 5개씩 시딩
-- (DO $$ FOR LOOP를 INSERT ... SELECT CROSS JOIN으로 변환)
-- 이미 시딩된 화장품 제조사 > 위생관리 그룹은 제외 (중복 방지)
INSERT INTO audit_template_items (group_id, item_content, display_order)
SELECT g.id,
       CONCAT(t.classification_name, ' [', g.group_name, '] 세부항목 1'),
       1
FROM audit_template_groups g
JOIN audit_templates t ON g.template_id = t.id
WHERE NOT (t.classification_name = '화장품 제조사 Audit' AND g.group_name = '위생관리');

INSERT INTO audit_template_items (group_id, item_content, display_order)
SELECT g.id,
       CONCAT(t.classification_name, ' [', g.group_name, '] 세부항목 2'),
       2
FROM audit_template_groups g
JOIN audit_templates t ON g.template_id = t.id
WHERE NOT (t.classification_name = '화장품 제조사 Audit' AND g.group_name = '위생관리');

INSERT INTO audit_template_items (group_id, item_content, display_order)
SELECT g.id,
       CONCAT(t.classification_name, ' [', g.group_name, '] 세부항목 3'),
       3
FROM audit_template_groups g
JOIN audit_templates t ON g.template_id = t.id
WHERE NOT (t.classification_name = '화장품 제조사 Audit' AND g.group_name = '위생관리');

INSERT INTO audit_template_items (group_id, item_content, display_order)
SELECT g.id,
       CONCAT(t.classification_name, ' [', g.group_name, '] 세부항목 4'),
       4
FROM audit_template_groups g
JOIN audit_templates t ON g.template_id = t.id
WHERE NOT (t.classification_name = '화장품 제조사 Audit' AND g.group_name = '위생관리');

INSERT INTO audit_template_items (group_id, item_content, display_order)
SELECT g.id,
       CONCAT(t.classification_name, ' [', g.group_name, '] 세부항목 5'),
       5
FROM audit_template_groups g
JOIN audit_templates t ON g.template_id = t.id
WHERE NOT (t.classification_name = '화장품 제조사 Audit' AND g.group_name = '위생관리');
