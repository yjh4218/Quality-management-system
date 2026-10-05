-- Seed '제품코드별 포장재 조회' submenu under PRODUCTS_ROOT
INSERT INTO dynamic_menu (parent_id, menu_name, menu_code, menu_order, icon, is_active, menu_type)
SELECT p.id, '제품코드별 포장재 조회', 'SYS_PRODUCT_BOM_INQUIRY', 65, '📦', true, 'SYSTEM'
FROM dynamic_menu p
WHERE p.menu_code = 'PRODUCTS_ROOT'
  AND NOT EXISTS (SELECT 1 FROM dynamic_menu WHERE menu_code = 'SYS_PRODUCT_BOM_INQUIRY');
