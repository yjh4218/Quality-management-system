package com.example.ims.util;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import com.example.ims.entity.ProductType;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
@Profile("local")
public class MigrationTask implements CommandLineRunner {

    private final JdbcTemplate jdbcTemplate;
    private final org.springframework.security.crypto.password.PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) {
        log.info("Starting Automatic Database Migration Task...");

        try {
            // 1. Schema Migration: ADD COLUMNS (Feature 1, 2, 8, 11)
            jdbcTemplate.execute("ALTER TABLE wms_inbound ADD COLUMN IF NOT EXISTS control_sample_remarks TEXT");
            jdbcTemplate.execute("ALTER TABLE wms_inbound ADD COLUMN IF NOT EXISTS final_inspection_remarks TEXT");
            jdbcTemplate.execute("ALTER TABLE wms_inbound ADD COLUMN IF NOT EXISTS mfr_remarks TEXT");
            
            jdbcTemplate.execute("ALTER TABLE master_packaging_materials ADD COLUMN IF NOT EXISTS bom_code VARCHAR(100)");
            jdbcTemplate.execute("ALTER TABLE master_packaging_materials ADD COLUMN IF NOT EXISTS type VARCHAR(100)");
            jdbcTemplate.execute("ALTER TABLE master_packaging_materials ADD COLUMN IF NOT EXISTS detailed_type VARCHAR(100)");
            jdbcTemplate.execute("ALTER TABLE master_packaging_materials ADD COLUMN IF NOT EXISTS detailed_material TEXT");
            jdbcTemplate.execute("ALTER TABLE master_packaging_materials ADD COLUMN IF NOT EXISTS weight DOUBLE PRECISION DEFAULT 0");
            jdbcTemplate.execute("ALTER TABLE master_packaging_materials ADD COLUMN IF NOT EXISTS thickness DOUBLE PRECISION DEFAULT 0");
            jdbcTemplate.execute("ALTER TABLE master_packaging_materials ADD COLUMN IF NOT EXISTS is_multi_layer BOOLEAN DEFAULT FALSE");

            jdbcTemplate.execute("ALTER TABLE manufacturers ADD COLUMN IF NOT EXISTS manufacturer_code VARCHAR(255)");
            jdbcTemplate.execute("ALTER TABLE products ADD COLUMN IF NOT EXISTS photo_audit_disclosed BOOLEAN DEFAULT FALSE");

            jdbcTemplate.execute("CREATE TABLE IF NOT EXISTS master_packaging_material_layers (" +
                    "id BIGINT AUTO_INCREMENT PRIMARY KEY, " +
                    "master_material_id BIGINT NOT NULL, " +
                    "layer_seq INT NOT NULL, " +
                    "material_name VARCHAR(255) NOT NULL, " +
                    "weight DOUBLE PRECISION NOT NULL, " +
                    "thickness DOUBLE PRECISION NOT NULL, " +
                    "FOREIGN KEY (master_material_id) REFERENCES master_packaging_materials(id) ON DELETE CASCADE" +
                    ")");
            
            // --- Seeding ---
            seedBomCategories();
            seedPackagingTemplates();
            seedSalesChannels();
            
            // Rules depend on Channels
            log.info("Schema Migration: Seeding Detailed Channel Packaging Rules...");
            seedInitialRules();
            
            // Data Migration
            migrateProductChannels();

            // 2. Data Check & Backfill
            checkAndBackfillInboundData();

            // 3. Seed Role Permissions
            seedRolePermissions();

            // 4. Seed Default Users (admin/admin fallback)
            seedUsers();

            log.info("Schema Migration: Successfully completed all tasks.");
        } catch (Exception e) {
            log.error("Database Migration Task Failed: {}", e.getMessage(), e);
        }
    }

    private void seedBomCategories() {
        try {
            Integer catCount = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM bom_categories", Integer.class);
            if (catCount != null && catCount == 0) {
                log.info("Seeding initial BOM Categories...");
                String[][] initialData = {
                    {"용기", "PET병"}, {"용기", "초자(유리)"}, {"용기", "파우치"}, {"용기", "필름"}, {"용기", "합성수지 용기(헤비브로우, 트레이)"}, {"용기", "튜브"}, {"용기", "기타"},
                    {"캡", "원터치캡"}, {"캡", "막캡"}, {"캡", "스포이드"}, {"캡", "펌프"}, {"캡", "기타"},
                    {"라벨", "PP"}, {"라벨", "LDPE"}, {"라벨", "PET"}, {"라벨", "은박 + PP"}, {"라벨", "은박 + LDPE"}, {"라벨", "은박 + PET"}, {"라벨", "복합재질"}, {"라벨", "기타"},
                    {"단상자", "뷰티팩"}, {"단상자", "일반 종이"}, {"단상자", "기타"},
                    {"봉합라벨", "PP"}, {"봉합라벨", "LDPE"}, {"봉합라벨", "PET"}, {"봉합라벨", "기타"},
                    {"기타 잡자재", "실링지"}, {"기타 잡자재", "박킹"}, {"기타 잡자재", "리드"}, {"기타 잡자재", "기타"}
                };
                for (String[] data : initialData) {
                    jdbcTemplate.update("INSERT INTO bom_categories (main_type, sub_type, active, updated_by, updated_at) VALUES (?, ?, true, 'SYSTEM', CURRENT_TIMESTAMP)", data[0], data[1]);
                }
            }
        } catch (Exception e) {
            log.warn("BOM Categories seeding skipped: {}", e.getMessage());
        }
    }

    private void seedPackagingTemplates() {
        try {
            Integer templateCount = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM packaging_method_templates", Integer.class);
            if (templateCount != null && templateCount == 0) {
                log.info("Seeding 9 Product Type Templates...");
                for (ProductType type : ProductType.values()) {
                    jdbcTemplate.update("INSERT INTO packaging_method_templates (product_type, updated_by) VALUES (?, ?)", 
                        type.name(), "SYSTEM");
                    
                    Integer tid = jdbcTemplate.queryForObject("SELECT id FROM packaging_method_templates WHERE product_type = ?", Integer.class, type.name());
                    jdbcTemplate.update("INSERT INTO packaging_method_template_steps (template_id, step_number, instruction) VALUES (?, ?, ?)",
                        tid, 1, "Step 1: 용기/자재 준비 및 세척 상태 확인");
                    jdbcTemplate.update("INSERT INTO packaging_method_template_steps (template_id, step_number, instruction) VALUES (?, ?, ?)",
                        tid, 2, "Step 2: 충진 및 캡핑 (토크 확인 필수)");
                    jdbcTemplate.update("INSERT INTO packaging_method_template_steps (template_id, step_number, instruction) VALUES (?, ?, ?)",
                        tid, 3, "Step 3: 단상자 포장 및 봉합라벨 부착");
                }
            }
        } catch (Exception e) {
            log.warn("Packaging templates seeding failed: {}", e.getMessage());
        }
    }

    private void seedSalesChannels() {
        try {
            Integer channelCount = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM sales_channels", Integer.class);
            if (channelCount != null && channelCount == 0) {
                log.info("Seeding initial Sales Channels...");
                String[] channels = {"JP/OFF", "JP/ON(AMZ)", "Domestic/OY", "EU/ON(AMZ)", "Export/Others"};
                for (String name : channels) {
                    jdbcTemplate.update("INSERT INTO sales_channels (name, active, updated_by, updated_at) VALUES (?, true, 'SYSTEM', CURRENT_TIMESTAMP)", name);
                }
            }
        } catch (Exception e) {
            log.warn("Sales channels seeding failed: {}", e.getMessage());
        }
    }

    private void seedInitialRules() {
        // 기존 영문 데이터 한글화 트리거
        updateExistingRulesToKorean();

        // 1. JP/OFF
        seedRule("JP/OFF", "LABELING", "제조번호만 표시", "용기와 단상자에 제조번호만 착인 또는 압인 (사용기한 착인/압인 금지)");
        seedRule("JP/OFF", "LABELING", "사용기한 미표시", "각종 현품표(지퍼백, 인박스, 아웃박스, 팔레트)에 '사용기한 표시 금지'");
        seedRule("JP/OFF", "PROMOTION", "본품→증정품 순서", "기획세트: 단상자에 본품->증정품 순으로 모든 제조번호 착인 (1줄 권장). 현품표에도 동일 순서 표시 필수");
        seedRule("JP/OFF", "PACKAGING", "인박스 필수", "JP/OFF 제품은 반드시 인박스 사양을 사용해야 함");

        // 2. JP/ON(AMZ)
        seedRule("JP/ON(AMZ)", "PACKAGING", "지퍼백 주의문구", "지퍼백 사양 사용 시 현품표 하단에 일본어 주의 문구 기재 필수");

        // 3. Domestic/OY
        seedRule("Domestic/OY", "LOGISTICS", "아주팔레트", "아주팔레트 1,100 x 1,100 mm 사용");
        seedRule("Domestic/OY", "LOGISTICS", "높이 1,050mm", "팔레트 높이 제외 1,050mm 까지만 적재 가능");

        // 4. EU/ON(AMZ)
        seedRule("EU/ON(AMZ)", "LOGISTICS", "훈증 팔레트", "나무 팔레트 1,200 x 800 mm 훈증 팔레트 사용");
        seedRule("EU/ON(AMZ)", "LOGISTICS", "패드/각대 필수", "패드와 각대(Angle) 사용 필수");

        // 5. Export/Others
        seedRule("Export/Others", "LOGISTICS", "수출용 팔레트", "수출용 일회용 팔레트 사용");
        seedRule("Export/Others", "LOGISTICS", "패드/각대 필수", "패드와 각대(Angle) 사용 필수");
    }

    private void updateExistingRulesToKorean() {
        try {
            log.info("Updating existing rules to Korean values...");
            jdbcTemplate.update("UPDATE channel_packaging_rules SET rule_value = '제조번호만 표시' WHERE rule_value = 'ONLY_LOT'");
            jdbcTemplate.update("UPDATE channel_packaging_rules SET rule_value = '사용기한 미표시' WHERE rule_value = 'NO_EXPIRY'");
            jdbcTemplate.update("UPDATE channel_packaging_rules SET rule_value = '본품→증정품 순서' WHERE rule_value = 'SEQUENCE'");
            jdbcTemplate.update("UPDATE channel_packaging_rules SET rule_value = '인박스 필수' WHERE rule_value = 'INBOX_MANDATORY'");
            jdbcTemplate.update("UPDATE channel_packaging_rules SET rule_value = '지퍼백 주의문구' WHERE rule_value = 'ZIPPER_WARNING'");
            jdbcTemplate.update("UPDATE channel_packaging_rules SET rule_value = '아주팔레트' WHERE rule_value = 'PALLET_SPEC' AND warning_message LIKE '%아주%'");
            jdbcTemplate.update("UPDATE channel_packaging_rules SET rule_value = '훈증 팔레트' WHERE rule_value = 'PALLET_SPEC' AND warning_message LIKE '%훈증%'");
            jdbcTemplate.update("UPDATE channel_packaging_rules SET rule_value = '수출용 팔레트' WHERE rule_value = 'PALLET_SPEC' AND warning_message LIKE '%수출용%'");
            jdbcTemplate.update("UPDATE channel_packaging_rules SET rule_value = '패드/각대 필수' WHERE rule_value = 'PROTECTION'");
            jdbcTemplate.update("UPDATE channel_packaging_rules SET rule_value = '높이 1,050mm' WHERE rule_value = 'LOAD_HEIGHT'");
        } catch (Exception e) {
            log.warn("Rule data localization failed: {}", e.getMessage());
        }
    }

    private void seedRule(String channelName, String type, String value, String msg) {
        try {
            Long channelId = jdbcTemplate.queryForObject("SELECT id FROM sales_channels WHERE name = ?", Long.class, channelName);
            Integer exists = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM channel_packaging_rules WHERE channel_id = ? AND rule_type = ? AND rule_value = ?",
                Integer.class, channelId, type, value
            );
            
            if (exists != null && exists == 0) {
                jdbcTemplate.update(
                    "INSERT INTO channel_packaging_rules (channel_id, rule_type, rule_value, warning_message, updated_by) VALUES (?, ?, ?, ?, ?)",
                    channelId, type, value, msg, "SYSTEM"
                );
            }
        } catch (Exception e) {
            log.warn("Failed to seed rule for channel {}: {}", channelName, e.getMessage());
        }
    }

    private void migrateProductChannels() {
        log.info("Migrating legacy product channels to relational model...");
        try {
            // Read from product_channels table if it exists (previous @ElementCollection<String> implementation)
            jdbcTemplate.execute("INSERT INTO product_sales_channels (product_id, channel_id) " +
                    "SELECT pc.product_id, sc.id " +
                    "FROM product_channels pc " +
                    "JOIN sales_channels sc ON sc.name = pc.channels " +
                    "WHERE NOT EXISTS (SELECT 1 FROM product_sales_channels psc WHERE psc.product_id = pc.product_id AND psc.channel_id = sc.id)");
            log.info("Legacy channel data migration completed.");
        } catch (Exception e) {
            log.warn("Migration from product_channels table skipped or failed: {}", e.getMessage());
        }
    }

    private void checkAndBackfillInboundData() {
        try {
            Integer count = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM wms_inbound WHERE inbound_date >= CURRENT_DATE", 
                Integer.class
            );

            if (count != null && count == 0) {
                log.info("Starting data backfill...");
                String insertSql = "INSERT INTO wms_inbound " +
                        "(grn_number, item_code, product_name, quantity, manufacturer, inbound_date, " +
                        "overall_status, inbound_inspection_status, inbound_inspection_result, " +
                        "control_sample_status, final_inspection_result, is_deleted) " +
                        "VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?, ?, ?, ?, ?, false)";

                jdbcTemplate.update(insertSql, "GRN-2026-001", "PRD-001", "프리미엄 세럼 (샘플)", 500, "더파운더즈", 
                                   "STEP1_WAITING", "검사 대기", "판정 중", "검사 대기", "판정 중");
                
                jdbcTemplate.update(insertSql, "GRN-2026-002", "PRD-002", "수분 크림 (성전제조)", 300, "성전제조", 
                                   "STEP5_FINAL_COMPLETE", "검사 완료", "적합", "검사 완료", "적합");
                
                // Sample claim
                jdbcTemplate.execute("INSERT INTO claims (claim_number, item_code, product_name, manufacturer, receipt_date, quality_status, mfr_status, mfr_termination_date, is_deleted, shared_with_manufacturer) " +
                    "VALUES ('CLM-TEST-001', 'AA00061', '모이스처 립밤 (알림 테스트)', '한국콜마', CURRENT_DATE, '4. 클레임 종결', '5단계 (종결)', CURRENT_DATE, false, false)");

                log.info("Inbound sample data inserted successfully.");
            }
        } catch (Exception e) {
            log.warn("Inbound backfill failed: {}", e.getMessage());
        }
    }

    private void seedRolePermissions() {
        try {
            log.info("Seeding Role Permissions for ADMIN and QUALITY...");
            String adminPermissions = "[\"AUDIT_DISCLOSE_MANAGE\", \"PRODUCT_DISCLOSE_MANAGE\", \"PRODUCT_MASTER_MANAGE\", \"DASHBOARD_QUALITY_VIEW\", \"BOM_VIEW\"]";
            jdbcTemplate.update("UPDATE roles SET allowed_permissions = ? WHERE role_key IN ('ROLE_ADMIN', 'ROLE_QUALITY') AND (allowed_permissions IS NULL OR allowed_permissions = '[]' OR allowed_permissions = '')", adminPermissions);
        } catch (Exception e) {
            log.warn("Role Permissions seeding failed: {}", e.getMessage());
        }
    }

    private void seedUsers() {
        try {
            log.info("Seeding initial users for local development...");
            
            // Check if admin exists
            Integer adminCount = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM users WHERE username = 'admin'", Integer.class);
            if (adminCount != null && adminCount == 0) {
                log.info("Creating default 'admin' user...");
                String encodedPw = passwordEncoder.encode("admin");
                jdbcTemplate.update(
                    "INSERT INTO users (username, password, name, company_name, department, role, enabled, locked, failed_attempts, password_reset_required, created_at) " +
                    "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)",
                    "admin", encodedPw, "시스템 관리자", "더파운더즈", "관리팀", "ROLE_ADMIN", true, false, 0, false
                );
            }

            // Seed other essential local users
            seedLocalUser("qa", "qa", "품질담당자", "더파운더즈", "품질팀", "ROLE_QUALITY");
            seedLocalUser("ko", "ko", "제조사담당자", "한국콜마", "영업팀", "ROLE_MANUFACTURER");
            
        } catch (Exception e) {
            log.warn("User seeding failed: {}", e.getMessage());
        }
    }

    private void seedLocalUser(String username, String rawPw, String name, String company, String dept, String role) {
        Integer count = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM users WHERE username = ?", Integer.class, username);
        if (count != null && count == 0) {
            String encodedPw = passwordEncoder.encode(rawPw);
            jdbcTemplate.update(
                "INSERT INTO users (username, password, name, company_name, department, role, enabled, locked, failed_attempts, password_reset_required, created_at) " +
                "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)",
                username, encodedPw, name, company, dept, role, true, false, 0, false
            );
        }
    }
}
