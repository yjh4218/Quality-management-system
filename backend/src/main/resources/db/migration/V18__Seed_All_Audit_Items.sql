-- V18: 모든 분류 및 점검항목에 세부항목 5개씩 시딩

-- 1. 나머지 분류들에 대해 점검항목 그룹 등록
DO $$
DECLARE
    t_record RECORD;
BEGIN
    FOR t_record IN SELECT id, classification_name FROM audit_templates WHERE classification_name != '화장품 제조사 Audit' LOOP
        INSERT INTO audit_template_groups (template_id, group_name, display_order) VALUES (t_record.id, '운영관리', 1);
        INSERT INTO audit_template_groups (template_id, group_name, display_order) VALUES (t_record.id, '위생관리', 2);
        INSERT INTO audit_template_groups (template_id, group_name, display_order) VALUES (t_record.id, '공정관리', 3);
        INSERT INTO audit_template_groups (template_id, group_name, display_order) VALUES (t_record.id, '품질관리', 4);
        INSERT INTO audit_template_groups (template_id, group_name, display_order) VALUES (t_record.id, '교육관리', 5);
        INSERT INTO audit_template_groups (template_id, group_name, display_order) VALUES (t_record.id, '클레임관리', 6);
    END LOOP;
END $$;

-- 2. 모든 점검항목 그룹에 대해 세부항목 5개씩 시딩
DO $$
DECLARE
    g_record RECORD;
    i INT;
    item_name TEXT;
BEGIN
    FOR g_record IN SELECT g.id, g.group_name, t.classification_name 
                   FROM audit_template_groups g 
                   JOIN audit_templates t ON g.template_id = t.id 
                   -- 이미 시딩된 화장품 제조사 > 위생관리 그룹은 제외 (중복 방지)
                   WHERE NOT (t.classification_name = '화장품 제조사 Audit' AND g.group_name = '위생관리') LOOP
        
        FOR i IN 1..5 LOOP
            item_name := g_record.classification_name || ' [' || g_record.group_name || '] 세부항목 ' || i;
            INSERT INTO audit_template_items (group_id, item_content, display_order) 
            VALUES (g_record.id, item_name, i);
        END LOOP;
        
    END LOOP;
END $$;
