-- V85: 전수 GAP 분석 기반 누락 컬럼 및 테이블 일괄 추가
-- H2 & PostgreSQL (Supabase) Cross-Compatible Migration (ADD COLUMN IF NOT EXISTS / CREATE TABLE IF NOT EXISTS)

-- 1. sales_channels 누락 컬럼
ALTER TABLE sales_channels ADD COLUMN IF NOT EXISTS pop_required BOOLEAN;
ALTER TABLE sales_channels ADD COLUMN IF NOT EXISTS cushioning_standard VARCHAR(255);

-- 2. manufacturer_audits 누락 컬럼
ALTER TABLE manufacturer_audits ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;
ALTER TABLE manufacturer_audits ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;

-- 3. packaging_specifications 누락 컬럼
ALTER TABLE packaging_specifications ADD COLUMN IF NOT EXISTS container_marking_display VARCHAR(255);
ALTER TABLE packaging_specifications ADD COLUMN IF NOT EXISTS container_marking_location VARCHAR(255);
ALTER TABLE packaging_specifications ADD COLUMN IF NOT EXISTS container_marking_text TEXT;
ALTER TABLE packaging_specifications ADD COLUMN IF NOT EXISTS container_marking_lot_format VARCHAR(255);
ALTER TABLE packaging_specifications ADD COLUMN IF NOT EXISTS container_marking_expiry_format VARCHAR(255);
ALTER TABLE packaging_specifications ADD COLUMN IF NOT EXISTS unit_box_marking_display VARCHAR(255);
ALTER TABLE packaging_specifications ADD COLUMN IF NOT EXISTS unit_box_marking_location VARCHAR(255);
ALTER TABLE packaging_specifications ADD COLUMN IF NOT EXISTS unit_box_marking_text TEXT;
ALTER TABLE packaging_specifications ADD COLUMN IF NOT EXISTS unit_box_marking_lot_format VARCHAR(255);
ALTER TABLE packaging_specifications ADD COLUMN IF NOT EXISTS unit_box_marking_expiry_format VARCHAR(255);
ALTER TABLE packaging_specifications ADD COLUMN IF NOT EXISTS inbox_packaging_type VARCHAR(255);
ALTER TABLE packaging_specifications ADD COLUMN IF NOT EXISTS inbox_tape_method VARCHAR(255);
ALTER TABLE packaging_specifications ADD COLUMN IF NOT EXISTS outbox_total_qty INTEGER;
ALTER TABLE packaging_specifications ADD COLUMN IF NOT EXISTS outbox_inbox_qty INTEGER;
ALTER TABLE packaging_specifications ADD COLUMN IF NOT EXISTS pop_required_standard VARCHAR(255);
ALTER TABLE packaging_specifications ADD COLUMN IF NOT EXISTS pallet_spec VARCHAR(255);
ALTER TABLE packaging_specifications ADD COLUMN IF NOT EXISTS pallet_total_product_qty INTEGER;

-- 4. master_packaging_materials 누락 컬럼
ALTER TABLE master_packaging_materials ADD COLUMN IF NOT EXISTS bom_code VARCHAR(255);
ALTER TABLE master_packaging_materials ADD COLUMN IF NOT EXISTS detailed_type VARCHAR(100);
ALTER TABLE master_packaging_materials ADD COLUMN IF NOT EXISTS detailed_material VARCHAR(255);
ALTER TABLE master_packaging_materials ADD COLUMN IF NOT EXISTS specification VARCHAR(255);
ALTER TABLE master_packaging_materials ADD COLUMN IF NOT EXISTS is_multi_layer BOOLEAN DEFAULT FALSE;

-- 5. products 누락 컬럼
ALTER TABLE products ADD COLUMN IF NOT EXISTS product_barcode VARCHAR(100);

-- 5-1. announcements, audit_templates, bug_reports 누락 컬럼
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS announcement_number VARCHAR(100);
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS content TEXT;
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS target_roles TEXT;
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS created_by_username VARCHAR(255);
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS created_by_name VARCHAR(255);
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE audit_templates ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;
ALTER TABLE audit_templates ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;

ALTER TABLE bug_reports ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE bug_reports ADD COLUMN IF NOT EXISTS steps TEXT;
ALTER TABLE bug_reports ADD COLUMN IF NOT EXISTS screen_name VARCHAR(255);
ALTER TABLE bug_reports ADD COLUMN IF NOT EXISTS url TEXT;
ALTER TABLE bug_reports ADD COLUMN IF NOT EXISTS severity VARCHAR(50);
ALTER TABLE bug_reports ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'OPEN';
ALTER TABLE bug_reports ADD COLUMN IF NOT EXISTS reporter_username VARCHAR(255);
ALTER TABLE bug_reports ADD COLUMN IF NOT EXISTS reporter_name VARCHAR(255);
ALTER TABLE bug_reports ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE channel_packaging_rules ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE channel_packaging_rules ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- 6. bom_categories 테이블 생성
CREATE TABLE IF NOT EXISTS bom_categories (
    id BIGSERIAL PRIMARY KEY,
    main_type VARCHAR(255) NOT NULL,
    sub_type VARCHAR(255) NOT NULL,
    active BOOLEAN DEFAULT TRUE,
    updated_by VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. ingredient_regulation_histories 테이블 생성
CREATE TABLE IF NOT EXISTS ingredient_regulation_histories (
    id BIGSERIAL PRIMARY KEY,
    inci_name VARCHAR(1000),
    korean_name VARCHAR(2000),
    cas_number VARCHAR(255),
    change_type VARCHAR(50),
    country VARCHAR(50),
    field_name VARCHAR(100),
    old_value VARCHAR(2000),
    new_value VARCHAR(2000),
    updated_by VARCHAR(100),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 8. manufacturer_categories 테이블 생성
CREATE TABLE IF NOT EXISTS manufacturer_categories (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 9. manufacturer_files 테이블 생성
CREATE TABLE IF NOT EXISTS manufacturer_files (
    id BIGSERIAL PRIMARY KEY,
    manufacturer_id BIGINT,
    file_path VARCHAR(500),
    file_name VARCHAR(255),
    category VARCHAR(100),
    FOREIGN KEY (manufacturer_id) REFERENCES manufacturers(id) ON DELETE CASCADE
);

-- 10. master_packaging_material_layers 테이블 생성
CREATE TABLE IF NOT EXISTS master_packaging_material_layers (
    id BIGSERIAL PRIMARY KEY,
    layer_seq INT NOT NULL,
    material_name VARCHAR(255) NOT NULL,
    weight DOUBLE PRECISION NOT NULL,
    thickness DOUBLE PRECISION NOT NULL,
    master_material_id BIGINT,
    FOREIGN KEY (master_material_id) REFERENCES master_packaging_materials(id) ON DELETE CASCADE
);

-- 11. packaging_method_template_steps 테이블 생성
CREATE TABLE IF NOT EXISTS packaging_method_template_steps (
    id BIGSERIAL PRIMARY KEY,
    step_number INT,
    instruction TEXT,
    image_url VARCHAR(500),
    template_id BIGINT,
    FOREIGN KEY (template_id) REFERENCES packaging_method_templates(id) ON DELETE CASCADE
);

-- 11-1. claim_photos 테이블 생성
CREATE TABLE IF NOT EXISTS claim_photos (
    id BIGSERIAL PRIMARY KEY,
    claim_id BIGINT,
    file_path VARCHAR(500),
    file_name VARCHAR(255),
    photo_url VARCHAR(500),
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 11-2. document_requirement_histories 테이블 생성
CREATE TABLE IF NOT EXISTS document_requirement_histories (
    id BIGSERIAL PRIMARY KEY,
    requirement_id BIGINT NOT NULL,
    file_name VARCHAR(255),
    file_url VARCHAR(1000),
    uploaded_by VARCHAR(255),
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    change_reason VARCHAR(255),
    status VARCHAR(50)
);

-- 11-3. channel_sticker_images 테이블 및 컬럼 보강
CREATE TABLE IF NOT EXISTS channel_sticker_images (
    id BIGSERIAL PRIMARY KEY,
    channel_id BIGINT NOT NULL,
    image_path VARCHAR(500),
    uploaded_by VARCHAR(255),
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE channel_sticker_images ADD COLUMN IF NOT EXISTS channel_id BIGINT;

-- 11-4. claim_history 테이블 및 컬럼 보강
CREATE TABLE IF NOT EXISTS claim_history (
    id BIGSERIAL PRIMARY KEY,
    claim_id BIGINT NOT NULL,
    modifier VARCHAR(255) NOT NULL,
    modifier_id BIGINT,
    modifier_username VARCHAR(255),
    modifier_name VARCHAR(255),
    modifier_company VARCHAR(255),
    modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    field_name VARCHAR(255),
    old_value TEXT,
    new_value TEXT
);
ALTER TABLE claim_history ADD COLUMN IF NOT EXISTS claim_id BIGINT;
ALTER TABLE claim_history ADD COLUMN IF NOT EXISTS modifier VARCHAR(255);
ALTER TABLE claim_history ADD COLUMN IF NOT EXISTS field_name VARCHAR(255);
ALTER TABLE claim_history ADD COLUMN IF NOT EXISTS modifier_id BIGINT;
ALTER TABLE claim_history ADD COLUMN IF NOT EXISTS modifier_username VARCHAR(255);
ALTER TABLE claim_history ADD COLUMN IF NOT EXISTS modifier_name VARCHAR(255);
ALTER TABLE claim_history ADD COLUMN IF NOT EXISTS modifier_company VARCHAR(255);
ALTER TABLE claim_history ADD COLUMN IF NOT EXISTS modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE claim_history ADD COLUMN IF NOT EXISTS old_value TEXT;
ALTER TABLE claim_history ADD COLUMN IF NOT EXISTS new_value TEXT;

-- 11-5. claims 테이블 컬럼 보강
ALTER TABLE claims ADD COLUMN IF NOT EXISTS claim_number VARCHAR(255);
ALTER TABLE claims ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;
ALTER TABLE claims ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
ALTER TABLE claims ADD COLUMN IF NOT EXISTS receipt_date DATE;
ALTER TABLE claims ADD COLUMN IF NOT EXISTS country VARCHAR(255);
ALTER TABLE claims ADD COLUMN IF NOT EXISTS item_code VARCHAR(255);
ALTER TABLE claims ADD COLUMN IF NOT EXISTS product_name VARCHAR(255);
ALTER TABLE claims ADD COLUMN IF NOT EXISTS lot_number VARCHAR(255);
ALTER TABLE claims ADD COLUMN IF NOT EXISTS manufacturer VARCHAR(255);
ALTER TABLE claims ADD COLUMN IF NOT EXISTS occurrence_qty INT;
ALTER TABLE claims ADD COLUMN IF NOT EXISTS primary_category VARCHAR(255);
ALTER TABLE claims ADD COLUMN IF NOT EXISTS secondary_category VARCHAR(255);
ALTER TABLE claims ADD COLUMN IF NOT EXISTS tertiary_category VARCHAR(255);
ALTER TABLE claims ADD COLUMN IF NOT EXISTS claim_content TEXT;
ALTER TABLE claims ADD COLUMN IF NOT EXISTS quality_check_needed VARCHAR(255);
ALTER TABLE claims ADD COLUMN IF NOT EXISTS consumer_reply_needed VARCHAR(255);
ALTER TABLE claims ADD COLUMN IF NOT EXISTS product_retrieval_needed VARCHAR(255);
ALTER TABLE claims ADD COLUMN IF NOT EXISTS expected_retrieval_date DATE;
ALTER TABLE claims ADD COLUMN IF NOT EXISTS recall_date DATE;
ALTER TABLE claims ADD COLUMN IF NOT EXISTS quality_status VARCHAR(255);
ALTER TABLE claims ADD COLUMN IF NOT EXISTS shared_with_manufacturer BOOLEAN DEFAULT FALSE;
ALTER TABLE claims ADD COLUMN IF NOT EXISTS termination_date DATE;
ALTER TABLE claims ADD COLUMN IF NOT EXISTS root_cause_analysis TEXT;
ALTER TABLE claims ADD COLUMN IF NOT EXISTS preventative_action TEXT;
ALTER TABLE claims ADD COLUMN IF NOT EXISTS quality_received_returned_product VARCHAR(255);
ALTER TABLE claims ADD COLUMN IF NOT EXISTS quality_received_date DATE;
ALTER TABLE claims ADD COLUMN IF NOT EXISTS manufacturer_response_pdf VARCHAR(255);
ALTER TABLE claims ADD COLUMN IF NOT EXISTS mfr_root_cause_analysis TEXT;
ALTER TABLE claims ADD COLUMN IF NOT EXISTS mfr_preventative_action TEXT;
ALTER TABLE claims ADD COLUMN IF NOT EXISTS mfr_status VARCHAR(255);
ALTER TABLE claims ADD COLUMN IF NOT EXISTS mfr_recall_status VARCHAR(255);
ALTER TABLE claims ADD COLUMN IF NOT EXISTS mfr_recall_date DATE;
ALTER TABLE claims ADD COLUMN IF NOT EXISTS mfr_termination_date DATE;
ALTER TABLE claims ADD COLUMN IF NOT EXISTS quality_remarks TEXT;
ALTER TABLE claims ADD COLUMN IF NOT EXISTS mfr_remarks TEXT;
ALTER TABLE claims ADD COLUMN IF NOT EXISTS created_at TIMESTAMP;
ALTER TABLE claims ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP;
ALTER TABLE claims ADD COLUMN IF NOT EXISTS email_sent_at TIMESTAMP;
ALTER TABLE claims ADD COLUMN IF NOT EXISTS is_critical_claim BOOLEAN DEFAULT FALSE;
ALTER TABLE claims ADD COLUMN IF NOT EXISTS critical_request_status VARCHAR(255) DEFAULT 'PENDING';
ALTER TABLE claims ADD COLUMN IF NOT EXISTS version BIGINT;

-- 11-6. manufacturers 테이블 컬럼 보강
ALTER TABLE manufacturers ADD COLUMN IF NOT EXISTS created_at TIMESTAMP;
ALTER TABLE manufacturers ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP;
ALTER TABLE manufacturers ADD COLUMN IF NOT EXISTS category VARCHAR(255);
ALTER TABLE manufacturers ADD COLUMN IF NOT EXISTS identification_code VARCHAR(255);
ALTER TABLE manufacturers ADD COLUMN IF NOT EXISTS manufacturer_code VARCHAR(255);
ALTER TABLE manufacturers ADD COLUMN IF NOT EXISTS contact_person VARCHAR(255);
ALTER TABLE manufacturers ADD COLUMN IF NOT EXISTS department VARCHAR(255);
ALTER TABLE manufacturers ADD COLUMN IF NOT EXISTS position VARCHAR(255);
ALTER TABLE manufacturers ADD COLUMN IF NOT EXISTS homepage VARCHAR(255);
ALTER TABLE manufacturers ADD COLUMN IF NOT EXISTS description VARCHAR(255);
ALTER TABLE manufacturers ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT TRUE;
ALTER TABLE manufacturers ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;
ALTER TABLE manufacturers ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
ALTER TABLE manufacturers ADD COLUMN IF NOT EXISTS phone_number VARCHAR(255);
ALTER TABLE manufacturers ADD COLUMN IF NOT EXISTS email VARCHAR(255);

-- 11-7. master_packaging_materials 테이블 컬럼 보강
ALTER TABLE master_packaging_materials ADD COLUMN IF NOT EXISTS created_at TIMESTAMP;
ALTER TABLE master_packaging_materials ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP;
ALTER TABLE master_packaging_materials ADD COLUMN IF NOT EXISTS detailed_type VARCHAR(255);
ALTER TABLE master_packaging_materials ADD COLUMN IF NOT EXISTS detailed_material VARCHAR(255);
ALTER TABLE master_packaging_materials ADD COLUMN IF NOT EXISTS weight DOUBLE PRECISION;
ALTER TABLE master_packaging_materials ADD COLUMN IF NOT EXISTS thickness DOUBLE PRECISION;
ALTER TABLE master_packaging_materials ADD COLUMN IF NOT EXISTS material VARCHAR(255);
ALTER TABLE master_packaging_materials ADD COLUMN IF NOT EXISTS manufacturer VARCHAR(255);
ALTER TABLE master_packaging_materials ADD COLUMN IF NOT EXISTS specification VARCHAR(255);
ALTER TABLE master_packaging_materials ADD COLUMN IF NOT EXISTS is_multi_layer BOOLEAN DEFAULT FALSE;

-- 11-8. packaging_method_templates 테이블 및 컬럼 보강
CREATE TABLE IF NOT EXISTS packaging_method_templates (
    id BIGSERIAL PRIMARY KEY,
    product_type VARCHAR(255) NOT NULL UNIQUE,
    updated_by VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE packaging_method_templates ADD COLUMN IF NOT EXISTS created_at TIMESTAMP;
ALTER TABLE packaging_method_templates ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP;
ALTER TABLE packaging_method_templates ADD COLUMN IF NOT EXISTS updated_by VARCHAR(255);

-- 11-9. product_components 테이블 및 컬럼 보강
CREATE TABLE IF NOT EXISTS product_components (
    id BIGSERIAL PRIMARY KEY,
    product_id BIGINT,
    item_code VARCHAR(255),
    product_name VARCHAR(255),
    quantity INT,
    capacity VARCHAR(255),
    weight VARCHAR(255)
);
ALTER TABLE product_components ADD COLUMN IF NOT EXISTS product_id BIGINT;
ALTER TABLE product_components ADD COLUMN IF NOT EXISTS capacity VARCHAR(255);
ALTER TABLE product_components ADD COLUMN IF NOT EXISTS weight VARCHAR(255);

-- 11-10. product_history 테이블 및 컬럼 보강
CREATE TABLE IF NOT EXISTS product_history (
    id BIGSERIAL PRIMARY KEY,
    product_id BIGINT NOT NULL,
    modifier VARCHAR(255) NOT NULL,
    modifier_id BIGINT,
    modifier_username VARCHAR(255),
    modifier_name VARCHAR(255),
    modifier_company VARCHAR(255),
    modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    field_name VARCHAR(255),
    old_value TEXT,
    new_value TEXT
);
ALTER TABLE product_history ADD COLUMN IF NOT EXISTS product_id BIGINT;
ALTER TABLE product_history ADD COLUMN IF NOT EXISTS modifier VARCHAR(255);
ALTER TABLE product_history ADD COLUMN IF NOT EXISTS field_name VARCHAR(255);
ALTER TABLE product_history ADD COLUMN IF NOT EXISTS modifier_id BIGINT;
ALTER TABLE product_history ADD COLUMN IF NOT EXISTS modifier_username VARCHAR(255);
ALTER TABLE product_history ADD COLUMN IF NOT EXISTS modifier_name VARCHAR(255);
ALTER TABLE product_history ADD COLUMN IF NOT EXISTS modifier_company VARCHAR(255);
ALTER TABLE product_history ADD COLUMN IF NOT EXISTS modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE product_history ADD COLUMN IF NOT EXISTS old_value TEXT;
ALTER TABLE product_history ADD COLUMN IF NOT EXISTS new_value TEXT;

-- 11-11. product_ingredients 컬럼 보강
ALTER TABLE product_ingredients ADD COLUMN IF NOT EXISTS product_id BIGINT;
ALTER TABLE product_ingredients ADD COLUMN IF NOT EXISTS kor_name VARCHAR(255);
ALTER TABLE product_ingredients ADD COLUMN IF NOT EXISTS eng_name VARCHAR(255);
ALTER TABLE product_ingredients ADD COLUMN IF NOT EXISTS content_percent VARCHAR(50);
ALTER TABLE product_ingredients ADD COLUMN IF NOT EXISTS content_ppm VARCHAR(50);
ALTER TABLE product_ingredients ADD COLUMN IF NOT EXISTS content_ppb VARCHAR(50);
ALTER TABLE product_ingredients ADD COLUMN IF NOT EXISTS inci_name VARCHAR(255);
ALTER TABLE product_ingredients ADD COLUMN IF NOT EXISTS allergen_mark VARCHAR(255);
ALTER TABLE product_ingredients ADD COLUMN IF NOT EXISTS limit_class VARCHAR(255);

-- 11-12. production_audit 테이블 및 컬럼 보강
CREATE TABLE IF NOT EXISTS production_audit (
    id BIGSERIAL PRIMARY KEY,
    item_code VARCHAR(255) NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    manufacturer_name VARCHAR(255) NOT NULL,
    production_date DATE,
    upload_date TIMESTAMP,
    container_images TEXT,
    box_images TEXT,
    load_images TEXT,
    status VARCHAR(255),
    rejection_reason TEXT,
    is_disclosed BOOLEAN DEFAULT FALSE,
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP
);
ALTER TABLE production_audit ADD COLUMN IF NOT EXISTS item_code VARCHAR(255);
ALTER TABLE production_audit ADD COLUMN IF NOT EXISTS product_name VARCHAR(255);
ALTER TABLE production_audit ADD COLUMN IF NOT EXISTS manufacturer_name VARCHAR(255);
ALTER TABLE production_audit ADD COLUMN IF NOT EXISTS production_date DATE;
ALTER TABLE production_audit ADD COLUMN IF NOT EXISTS upload_date TIMESTAMP;
ALTER TABLE production_audit ADD COLUMN IF NOT EXISTS container_images TEXT;
ALTER TABLE production_audit ADD COLUMN IF NOT EXISTS box_images TEXT;
ALTER TABLE production_audit ADD COLUMN IF NOT EXISTS load_images TEXT;
ALTER TABLE production_audit ADD COLUMN IF NOT EXISTS status VARCHAR(255);
ALTER TABLE production_audit ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE production_audit ADD COLUMN IF NOT EXISTS is_disclosed BOOLEAN DEFAULT FALSE;
ALTER TABLE production_audit ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;
ALTER TABLE production_audit ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;

-- 11-13. products 테이블 전체 컬럼 보강
ALTER TABLE products ADD COLUMN IF NOT EXISTS version BIGINT DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS created_at TIMESTAMP;
ALTER TABLE products ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP;
ALTER TABLE products ADD COLUMN IF NOT EXISTS english_product_name VARCHAR(255);
ALTER TABLE products ADD COLUMN IF NOT EXISTS product_type VARCHAR(255);
ALTER TABLE products ADD COLUMN IF NOT EXISTS brand_id BIGINT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS manufacturer_id BIGINT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS shelf_life_months INT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS opened_shelf_life_months INT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS product_barcode VARCHAR(255);
ALTER TABLE products ADD COLUMN IF NOT EXISTS outbox_barcode VARCHAR(255);
ALTER TABLE products ADD COLUMN IF NOT EXISTS manufacturer VARCHAR(255);
ALTER TABLE products ADD COLUMN IF NOT EXISTS capacity VARCHAR(255);
ALTER TABLE products ADD COLUMN IF NOT EXISTS capacity_fl_oz DOUBLE PRECISION;
ALTER TABLE products ADD COLUMN IF NOT EXISTS weight VARCHAR(255);
ALTER TABLE products ADD COLUMN IF NOT EXISTS weight_oz DOUBLE PRECISION;
ALTER TABLE products ADD COLUMN IF NOT EXISTS width DOUBLE PRECISION;
ALTER TABLE products ADD COLUMN IF NOT EXISTS length DOUBLE PRECISION;
ALTER TABLE products ADD COLUMN IF NOT EXISTS height DOUBLE PRECISION;
ALTER TABLE products ADD COLUMN IF NOT EXISTS width_inch DOUBLE PRECISION;
ALTER TABLE products ADD COLUMN IF NOT EXISTS length_inch DOUBLE PRECISION;
ALTER TABLE products ADD COLUMN IF NOT EXISTS height_inch DOUBLE PRECISION;
ALTER TABLE products ADD COLUMN IF NOT EXISTS volume DOUBLE PRECISION;
ALTER TABLE products ADD COLUMN IF NOT EXISTS status VARCHAR(255);
ALTER TABLE products ADD COLUMN IF NOT EXISTS lid_material VARCHAR(255);
ALTER TABLE products ADD COLUMN IF NOT EXISTS body_material VARCHAR(255);
ALTER TABLE products ADD COLUMN IF NOT EXISTS label_material VARCHAR(255);
ALTER TABLE products ADD COLUMN IF NOT EXISTS other_material VARCHAR(255);
ALTER TABLE products ADD COLUMN IF NOT EXISTS has_inbox BOOLEAN DEFAULT TRUE;
ALTER TABLE products ADD COLUMN IF NOT EXISTS inbox_width DOUBLE PRECISION;
ALTER TABLE products ADD COLUMN IF NOT EXISTS inbox_length DOUBLE PRECISION;
ALTER TABLE products ADD COLUMN IF NOT EXISTS inbox_height DOUBLE PRECISION;
ALTER TABLE products ADD COLUMN IF NOT EXISTS inbox_width_inch DOUBLE PRECISION;
ALTER TABLE products ADD COLUMN IF NOT EXISTS inbox_length_inch DOUBLE PRECISION;
ALTER TABLE products ADD COLUMN IF NOT EXISTS inbox_height_inch DOUBLE PRECISION;
ALTER TABLE products ADD COLUMN IF NOT EXISTS inbox_quantity INT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS inbox_weight DOUBLE PRECISION;
ALTER TABLE products ADD COLUMN IF NOT EXISTS inbox_weight_lbs DOUBLE PRECISION;
ALTER TABLE products ADD COLUMN IF NOT EXISTS outbox_width DOUBLE PRECISION;
ALTER TABLE products ADD COLUMN IF NOT EXISTS outbox_length DOUBLE PRECISION;
ALTER TABLE products ADD COLUMN IF NOT EXISTS outbox_height DOUBLE PRECISION;
ALTER TABLE products ADD COLUMN IF NOT EXISTS outbox_width_inch DOUBLE PRECISION;
ALTER TABLE products ADD COLUMN IF NOT EXISTS outbox_length_inch DOUBLE PRECISION;
ALTER TABLE products ADD COLUMN IF NOT EXISTS outbox_height_inch DOUBLE PRECISION;
ALTER TABLE products ADD COLUMN IF NOT EXISTS outbox_quantity INT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS outbox_weight DOUBLE PRECISION;
ALTER TABLE products ADD COLUMN IF NOT EXISTS outbox_weight_lbs DOUBLE PRECISION;
ALTER TABLE products ADD COLUMN IF NOT EXISTS pallet_width DOUBLE PRECISION;
ALTER TABLE products ADD COLUMN IF NOT EXISTS pallet_length DOUBLE PRECISION;
ALTER TABLE products ADD COLUMN IF NOT EXISTS pallet_height DOUBLE PRECISION;
ALTER TABLE products ADD COLUMN IF NOT EXISTS pallet_width_inch DOUBLE PRECISION;
ALTER TABLE products ADD COLUMN IF NOT EXISTS pallet_length_inch DOUBLE PRECISION;
ALTER TABLE products ADD COLUMN IF NOT EXISTS pallet_height_inch DOUBLE PRECISION;
ALTER TABLE products ADD COLUMN IF NOT EXISTS pallet_quantity INT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS recycle_grade VARCHAR(255);
ALTER TABLE products ADD COLUMN IF NOT EXISTS recycle_eval_no VARCHAR(255);
ALTER TABLE products ADD COLUMN IF NOT EXISTS recycle_material VARCHAR(255);
ALTER TABLE products ADD COLUMN IF NOT EXISTS manufacturer_container VARCHAR(255);
ALTER TABLE products ADD COLUMN IF NOT EXISTS manufacturer_label VARCHAR(255);
ALTER TABLE products ADD COLUMN IF NOT EXISTS manufacturer_outer_box VARCHAR(255);
ALTER TABLE products ADD COLUMN IF NOT EXISTS manufacturer_etc VARCHAR(255);
ALTER TABLE products ADD COLUMN IF NOT EXISTS material_body VARCHAR(255);
ALTER TABLE products ADD COLUMN IF NOT EXISTS weight_body DOUBLE PRECISION;
ALTER TABLE products ADD COLUMN IF NOT EXISTS material_label VARCHAR(255);
ALTER TABLE products ADD COLUMN IF NOT EXISTS weight_label DOUBLE PRECISION;
ALTER TABLE products ADD COLUMN IF NOT EXISTS material_cap VARCHAR(255);
ALTER TABLE products ADD COLUMN IF NOT EXISTS weight_cap DOUBLE PRECISION;
ALTER TABLE products ADD COLUMN IF NOT EXISTS material_sealing VARCHAR(255);
ALTER TABLE products ADD COLUMN IF NOT EXISTS weight_sealing DOUBLE PRECISION;
ALTER TABLE products ADD COLUMN IF NOT EXISTS material_pump VARCHAR(255);
ALTER TABLE products ADD COLUMN IF NOT EXISTS weight_pump DOUBLE PRECISION;
ALTER TABLE products ADD COLUMN IF NOT EXISTS material_outer_box VARCHAR(255);
ALTER TABLE products ADD COLUMN IF NOT EXISTS weight_outer_box DOUBLE PRECISION;
ALTER TABLE products ADD COLUMN IF NOT EXISTS material_tool VARCHAR(255);
ALTER TABLE products ADD COLUMN IF NOT EXISTS weight_tool DOUBLE PRECISION;
ALTER TABLE products ADD COLUMN IF NOT EXISTS material_packing VARCHAR(255);
ALTER TABLE products ADD COLUMN IF NOT EXISTS weight_packing DOUBLE PRECISION;
ALTER TABLE products ADD COLUMN IF NOT EXISTS material_etc VARCHAR(255);
ALTER TABLE products ADD COLUMN IF NOT EXISTS weight_etc DOUBLE PRECISION;
ALTER TABLE products ADD COLUMN IF NOT EXISTS material_remarks TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS image_path VARCHAR(255);
ALTER TABLE products ADD COLUMN IF NOT EXISTS cert_standard VARCHAR(255);
ALTER TABLE products ADD COLUMN IF NOT EXISTS cert_msds VARCHAR(255);
ALTER TABLE products ADD COLUMN IF NOT EXISTS cert_function VARCHAR(255);
ALTER TABLE products ADD COLUMN IF NOT EXISTS cert_expiry VARCHAR(255);
ALTER TABLE products ADD COLUMN IF NOT EXISTS ingredients TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS parent_item_code VARCHAR(255);
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_parent BOOLEAN DEFAULT FALSE;
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_master BOOLEAN DEFAULT FALSE;
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_planning_set BOOLEAN DEFAULT FALSE;
ALTER TABLE products ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT TRUE;
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;
ALTER TABLE products ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
ALTER TABLE products ADD COLUMN IF NOT EXISTS photo_audit_disclosed BOOLEAN DEFAULT FALSE;
ALTER TABLE products ADD COLUMN IF NOT EXISTS certificate_path VARCHAR(255);
ALTER TABLE products ADD COLUMN IF NOT EXISTS content_volume_ml DOUBLE PRECISION;
ALTER TABLE products ADD COLUMN IF NOT EXISTS content_type VARCHAR(255);
-- 11-14. quality_reports 테이블 생성
CREATE TABLE IF NOT EXISTS quality_reports (
    id BIGSERIAL PRIMARY KEY,
    wms_inbound_id BIGINT NOT NULL,
    inspection_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_passed BOOLEAN,
    remark TEXT,
    inspector VARCHAR(255)
);

-- 11-15. system_page_guides 테이블 및 컬럼 보강
CREATE TABLE IF NOT EXISTS system_page_guides (
    id BIGSERIAL PRIMARY KEY,
    page_key VARCHAR(255) NOT NULL UNIQUE,
    title VARCHAR(255) NOT NULL,
    sections_json TEXT,
    content TEXT,
    updated_by VARCHAR(255),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE system_page_guides ADD COLUMN IF NOT EXISTS sections_json TEXT;
ALTER TABLE system_page_guides ADD COLUMN IF NOT EXISTS content TEXT;
ALTER TABLE system_page_guides ADD COLUMN IF NOT EXISTS updated_by VARCHAR(255);
ALTER TABLE system_page_guides ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP;
ALTER TABLE system_page_guides ADD COLUMN IF NOT EXISTS created_at TIMESTAMP;

-- 11-16. users 테이블 컬럼 보강
ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS password VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS name VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS company_name VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS manufacturer_id BIGINT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS department VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS position VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS email VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS enabled BOOLEAN DEFAULT TRUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS failed_attempts INT DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS locked BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_required BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_token VARCHAR(255);

-- 11-17. wms_inbound 테이블 컬럼 보강
ALTER TABLE wms_inbound ADD COLUMN IF NOT EXISTS grn_number VARCHAR(255);
ALTER TABLE wms_inbound ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;
ALTER TABLE wms_inbound ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
ALTER TABLE wms_inbound ADD COLUMN IF NOT EXISTS item_code VARCHAR(255);
ALTER TABLE wms_inbound ADD COLUMN IF NOT EXISTS product_name VARCHAR(255);
ALTER TABLE wms_inbound ADD COLUMN IF NOT EXISTS manufacturer VARCHAR(255);
ALTER TABLE wms_inbound ADD COLUMN IF NOT EXISTS quantity INT;
ALTER TABLE wms_inbound ADD COLUMN IF NOT EXISTS inbound_date TIMESTAMP;
ALTER TABLE wms_inbound ADD COLUMN IF NOT EXISTS lot_number VARCHAR(255);
ALTER TABLE wms_inbound ADD COLUMN IF NOT EXISTS expiration_date VARCHAR(255);
ALTER TABLE wms_inbound ADD COLUMN IF NOT EXISTS specific_gravity DOUBLE PRECISION;
ALTER TABLE wms_inbound ADD COLUMN IF NOT EXISTS coa_file_url TEXT;
ALTER TABLE wms_inbound ADD COLUMN IF NOT EXISTS coa_file_url_eng TEXT;
ALTER TABLE wms_inbound ADD COLUMN IF NOT EXISTS coa_decision_date VARCHAR(255);
ALTER TABLE wms_inbound ADD COLUMN IF NOT EXISTS test_report_numbers TEXT;
ALTER TABLE wms_inbound ADD COLUMN IF NOT EXISTS remark TEXT;
ALTER TABLE wms_inbound ADD COLUMN IF NOT EXISTS control_sample_remarks TEXT;
ALTER TABLE wms_inbound ADD COLUMN IF NOT EXISTS final_inspection_remarks TEXT;
ALTER TABLE wms_inbound ADD COLUMN IF NOT EXISTS mfr_remarks TEXT;
ALTER TABLE wms_inbound ADD COLUMN IF NOT EXISTS overall_status VARCHAR(255);
ALTER TABLE wms_inbound ADD COLUMN IF NOT EXISTS inbound_inspection_status VARCHAR(255);
ALTER TABLE wms_inbound ADD COLUMN IF NOT EXISTS inbound_inspection_result VARCHAR(255);
ALTER TABLE wms_inbound ADD COLUMN IF NOT EXISTS control_sample_status VARCHAR(255);
ALTER TABLE wms_inbound ADD COLUMN IF NOT EXISTS final_inspection_result VARCHAR(255);
ALTER TABLE wms_inbound ADD COLUMN IF NOT EXISTS quality_decision_date VARCHAR(255);
ALTER TABLE wms_inbound ADD COLUMN IF NOT EXISTS last_modified_at TIMESTAMP;
ALTER TABLE wms_inbound ADD COLUMN IF NOT EXISTS last_modified_by VARCHAR(255);

-- 11-18. wms_inbound_history 테이블 및 컬럼 보강
CREATE TABLE IF NOT EXISTS wms_inbound_history (
    id BIGSERIAL PRIMARY KEY,
    wms_inbound_id BIGINT NOT NULL,
    modifier VARCHAR(255) NOT NULL,
    modifier_id BIGINT,
    modifier_username VARCHAR(255),
    modifier_name VARCHAR(255),
    modifier_company VARCHAR(255),
    field_name VARCHAR(255),
    modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    change_log TEXT,
    old_value TEXT,
    new_value TEXT
);
ALTER TABLE wms_inbound_history ADD COLUMN IF NOT EXISTS wms_inbound_id BIGINT;
ALTER TABLE wms_inbound_history ADD COLUMN IF NOT EXISTS modifier VARCHAR(255);
ALTER TABLE wms_inbound_history ADD COLUMN IF NOT EXISTS modifier_id BIGINT;
ALTER TABLE wms_inbound_history ADD COLUMN IF NOT EXISTS modifier_username VARCHAR(255);
ALTER TABLE wms_inbound_history ADD COLUMN IF NOT EXISTS modifier_name VARCHAR(255);
ALTER TABLE wms_inbound_history ADD COLUMN IF NOT EXISTS modifier_company VARCHAR(255);
ALTER TABLE wms_inbound_history ADD COLUMN IF NOT EXISTS field_name VARCHAR(255);
ALTER TABLE wms_inbound_history ADD COLUMN IF NOT EXISTS modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE wms_inbound_history ADD COLUMN IF NOT EXISTS change_log TEXT;
ALTER TABLE wms_inbound_history ADD COLUMN IF NOT EXISTS old_value TEXT;
ALTER TABLE wms_inbound_history ADD COLUMN IF NOT EXISTS new_value TEXT;


-- 12. SERIAL PK 테이블들의 id 컬럼 BIGINT 타입 일괄 교정 (Hibernate validate 호환)
ALTER TABLE access_logs ADD COLUMN IF NOT EXISTS id BIGINT;
ALTER TABLE access_logs ALTER COLUMN id SET DATA TYPE BIGINT;
ALTER TABLE announcement_categories ADD COLUMN IF NOT EXISTS id BIGINT;
ALTER TABLE announcement_categories ALTER COLUMN id SET DATA TYPE BIGINT;
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS id BIGINT;
ALTER TABLE announcements ALTER COLUMN id SET DATA TYPE BIGINT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS id BIGINT;
ALTER TABLE users ALTER COLUMN id SET DATA TYPE BIGINT;
ALTER TABLE roles ADD COLUMN IF NOT EXISTS id BIGINT;
ALTER TABLE roles ALTER COLUMN id SET DATA TYPE BIGINT;
ALTER TABLE manufacturers ADD COLUMN IF NOT EXISTS id BIGINT;
ALTER TABLE manufacturers ALTER COLUMN id SET DATA TYPE BIGINT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS id BIGINT;
ALTER TABLE products ALTER COLUMN id SET DATA TYPE BIGINT;
ALTER TABLE claims ADD COLUMN IF NOT EXISTS id BIGINT;
ALTER TABLE claims ALTER COLUMN id SET DATA TYPE BIGINT;

ALTER TABLE wms_inbound ADD COLUMN IF NOT EXISTS id BIGINT;
ALTER TABLE wms_inbound ALTER COLUMN id SET DATA TYPE BIGINT;
ALTER TABLE wms_inbound ALTER COLUMN inbound_date SET DATA TYPE TIMESTAMP;
ALTER TABLE wms_inbound_history ADD COLUMN IF NOT EXISTS id BIGINT;
ALTER TABLE wms_inbound_history ALTER COLUMN id SET DATA TYPE BIGINT;
ALTER TABLE product_history ADD COLUMN IF NOT EXISTS id BIGINT;
ALTER TABLE product_history ALTER COLUMN id SET DATA TYPE BIGINT;
ALTER TABLE claim_history ADD COLUMN IF NOT EXISTS id BIGINT;
ALTER TABLE claim_history ALTER COLUMN id SET DATA TYPE BIGINT;
ALTER TABLE production_audit ADD COLUMN IF NOT EXISTS id BIGINT;
ALTER TABLE production_audit ALTER COLUMN id SET DATA TYPE BIGINT;
ALTER TABLE notification_settings ADD COLUMN IF NOT EXISTS id BIGINT;
ALTER TABLE notification_settings ALTER COLUMN id SET DATA TYPE BIGINT;
ALTER TABLE dashboard_layouts ADD COLUMN IF NOT EXISTS id BIGINT;
ALTER TABLE dashboard_layouts ALTER COLUMN id SET DATA TYPE BIGINT;
ALTER TABLE page_guides ADD COLUMN IF NOT EXISTS id BIGINT;
ALTER TABLE page_guides ALTER COLUMN id SET DATA TYPE BIGINT;
ALTER TABLE sales_channels ADD COLUMN IF NOT EXISTS id BIGINT;
ALTER TABLE sales_channels ALTER COLUMN id SET DATA TYPE BIGINT;
ALTER TABLE production_audit_history ADD COLUMN IF NOT EXISTS id BIGINT;
ALTER TABLE production_audit_history ALTER COLUMN id SET DATA TYPE BIGINT;
ALTER TABLE channel_packaging_rules ADD COLUMN IF NOT EXISTS id BIGINT;
ALTER TABLE channel_packaging_rules ALTER COLUMN id SET DATA TYPE BIGINT;
ALTER TABLE master_packaging_materials ADD COLUMN IF NOT EXISTS id BIGINT;
ALTER TABLE master_packaging_materials ALTER COLUMN id SET DATA TYPE BIGINT;
ALTER TABLE packaging_specifications ADD COLUMN IF NOT EXISTS id BIGINT;
ALTER TABLE packaging_specifications ALTER COLUMN id SET DATA TYPE BIGINT;
ALTER TABLE channel_sticker_images ADD COLUMN IF NOT EXISTS id BIGINT;
ALTER TABLE channel_sticker_images ALTER COLUMN id SET DATA TYPE BIGINT;
ALTER TABLE packaging_method_templates ADD COLUMN IF NOT EXISTS id BIGINT;
ALTER TABLE packaging_method_templates ALTER COLUMN id SET DATA TYPE BIGINT;
ALTER TABLE packaging_spec_bom_items ADD COLUMN IF NOT EXISTS id BIGINT;
ALTER TABLE packaging_spec_bom_items ALTER COLUMN id SET DATA TYPE BIGINT;
ALTER TABLE claim_photos ADD COLUMN IF NOT EXISTS id BIGINT;
ALTER TABLE claim_photos ALTER COLUMN id SET DATA TYPE BIGINT;
ALTER TABLE product_ingredients ADD COLUMN IF NOT EXISTS id BIGINT;
ALTER TABLE product_ingredients ALTER COLUMN id SET DATA TYPE BIGINT;
ALTER TABLE audit_templates ADD COLUMN IF NOT EXISTS id BIGINT;
ALTER TABLE audit_templates ALTER COLUMN id SET DATA TYPE BIGINT;
ALTER TABLE audit_template_groups ADD COLUMN IF NOT EXISTS id BIGINT;
ALTER TABLE audit_template_groups ALTER COLUMN id SET DATA TYPE BIGINT;
ALTER TABLE audit_template_items ADD COLUMN IF NOT EXISTS id BIGINT;
ALTER TABLE audit_template_items ALTER COLUMN id SET DATA TYPE BIGINT;
ALTER TABLE manufacturer_audit_history ADD COLUMN IF NOT EXISTS id BIGINT;
ALTER TABLE manufacturer_audit_history ALTER COLUMN id SET DATA TYPE BIGINT;
ALTER TABLE product_test_reports ADD COLUMN IF NOT EXISTS id BIGINT;
ALTER TABLE product_test_reports ALTER COLUMN id SET DATA TYPE BIGINT;
ALTER TABLE packaging_spec_revisions ADD COLUMN IF NOT EXISTS id BIGINT;
ALTER TABLE packaging_spec_revisions ALTER COLUMN id SET DATA TYPE BIGINT;
ALTER TABLE packaging_spec_components ADD COLUMN IF NOT EXISTS id BIGINT;
ALTER TABLE packaging_spec_components ALTER COLUMN id SET DATA TYPE BIGINT;
ALTER TABLE product_components ADD COLUMN IF NOT EXISTS id BIGINT;
ALTER TABLE product_components ALTER COLUMN id SET DATA TYPE BIGINT;
ALTER TABLE packaging_method_images ADD COLUMN IF NOT EXISTS id BIGINT;
ALTER TABLE packaging_method_images ALTER COLUMN id SET DATA TYPE BIGINT;
ALTER TABLE custom_document_types ADD COLUMN IF NOT EXISTS id BIGINT;
ALTER TABLE custom_document_types ALTER COLUMN id SET DATA TYPE BIGINT;
ALTER TABLE document_requirements ADD COLUMN IF NOT EXISTS id BIGINT;
ALTER TABLE document_requirements ALTER COLUMN id SET DATA TYPE BIGINT;
ALTER TABLE document_request_logs ADD COLUMN IF NOT EXISTS id BIGINT;
ALTER TABLE document_request_logs ALTER COLUMN id SET DATA TYPE BIGINT;
ALTER TABLE document_requirement_histories ADD COLUMN IF NOT EXISTS id BIGINT;
ALTER TABLE document_requirement_histories ALTER COLUMN id SET DATA TYPE BIGINT;
ALTER TABLE packaging_components ADD COLUMN IF NOT EXISTS id BIGINT;
ALTER TABLE packaging_components ALTER COLUMN id SET DATA TYPE BIGINT;
ALTER TABLE packaging_layers ADD COLUMN IF NOT EXISTS id BIGINT;
ALTER TABLE packaging_layers ALTER COLUMN id SET DATA TYPE BIGINT;

