package com.example.ims.service;

import com.example.ims.entity.User;
import com.example.ims.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Service responsible for idempotent system initialization and data repair.
 * Extracted from SystemStartupRunner to ensure @Transactional works correctly.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class SystemInitializationService {

    private final JdbcTemplate jdbcTemplate;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final org.springframework.core.env.Environment env;

    @Transactional
    public void seedAndRepairData(String adminInitialPassword) {
        log.info(">>>> [SYSTEM INIT] Starting Data Seeding & Repair...");

        repairProductTableSchema();
        repairUserTableSchema();
        repairRolesTableSchema();
        repairAdminAccount(adminInitialPassword);
        seedTestUsers();
        seedAndRepairRoles();
        migrateProductImages();
        seedAndRepairDashboardLayouts();
        seedAndRepairPageGuides();

        // Page guides are now handled entirely by Bulk Migration and use
        // SystemPageGuide entity

        repairAllSequences();

        log.info(">>>> [SYSTEM INIT] Data Seeding & Repair Completed.");
        performDataAudit();
    }

    private void repairAdminAccount(String adminInitialPassword) {
        boolean isLocal = java.util.Arrays.asList(env.getActiveProfiles()).contains("local") ||
                java.util.Arrays.asList(env.getDefaultProfiles()).contains("local");

        final String targetPassword;
        if (isLocal && (adminInitialPassword == null || adminInitialPassword.trim().isEmpty())) {
            targetPassword = "admin";
            log.info(">>>> [SYSTEM INIT] [LOCAL ONLY] Falling back to default admin password for development.");
        } else {
            targetPassword = adminInitialPassword;
        }

        userRepository.findByUsername("admin").ifPresentOrElse(admin -> {
            boolean changed = false;
            if (admin.getName() == null || admin.getName().isEmpty()) {
                admin.setName("\uC2DC\uC2A4\uD15C \uAD00\uB9AC\uC790");
                changed = true;
            }
            if (admin.getCompanyName() == null || admin.getCompanyName().isEmpty()) {
                admin.setCompanyName("\uB354\uD30C\uC6B4\uB354\uC988");
                changed = true;
            }
            if (admin.getRole() == null || !admin.getRole().equals("ROLE_ADMIN")) {
                admin.setRole("ROLE_ADMIN");
                changed = true;
            }
            if (!admin.isEnabled()) {
                admin.setEnabled(true);
                changed = true;
            }

            // Force set/reset if it's local and we want the default "admin"
            if (isLocal && (admin.getPassword() == null || admin.getPassword().isEmpty()
                    || "admin".equals(targetPassword))) {
                admin.setPassword(passwordEncoder.encode("admin"));
                admin.setLocked(false);
                admin.setFailedAttempts(0);
                admin.setEnabled(true);
                changed = true;
                log.info(
                        ">>>> [SYSTEM INIT] [LOCAL] Ensuring admin password is set to 'admin', unlocked, and enabled.");
            } else if (targetPassword != null && !targetPassword.isEmpty() && !targetPassword.equals("admin")) {
                admin.setPassword(passwordEncoder.encode(targetPassword));
                changed = true;
            }

            if (changed) {
                userRepository.saveAndFlush(admin);
                log.info(">>>> [SYSTEM INIT] Admin account repaired and synchronized.");
            } else {
                log.info(">>>> [SYSTEM INIT] Admin account verified.");
            }
        }, () -> {
            if (!isLocal && (targetPassword == null || targetPassword.trim().isEmpty())) {
                log.warn(
                        ">>>> [SYSTEM INIT] [CRITICAL] Admin not found and no password provided in production. Skipping insecure creation.");
                return;
            }

            userRepository.saveAndFlush(User.builder()
                    .username("admin")
                    .password(passwordEncoder.encode(targetPassword))
                    .name("\uC2DC\uC2A4\uD15C \uAD00\uB9AC\uC790")
                    .companyName("\uB354\uD30C\uC6B4\uB354\uC988")
                    .role("ROLE_ADMIN")
                    .enabled(true)
                    .build());
            log.info(">>>> [SYSTEM INIT] Initial Admin created with target password.");
        });
    }

    private void seedAndRepairRoles() {
        String allActions = "[\"VIEW\",\"EDIT\",\"DELETE\"]";
        String viewOnly = "[\"VIEW\"]";

        String adminJson = "{\"dashboard\":" + viewOnly + ",\"users\":" + allActions + ",\"logs\":" + viewOnly
                + ",\"roles\":" + allActions + ",\"brands\":" + allActions + ",\"manufacturers\":" + allActions
                + ",\"salesChannels\":" + allActions + ",\"products\":" + allActions + ",\"bomMaster\":" + allActions
                + ",\"bomCategories\":" + allActions + ",\"packagingTemplates\":" + allActions + ",\"packagingRules\":"
                + allActions + ",\"quality\":" + allActions + ",\"releaseRecord\":" + allActions + ",\"claims\":"
                + allActions + ",\"claimDashboard\":" + viewOnly + "}";
        String qualityJson = "{\"dashboard\":" + viewOnly + ",\"products\":" + viewOnly + ",\"quality\":" + allActions
                + ",\"releaseRecord\":" + allActions + ",\"claims\":" + allActions + ",\"claimDashboard\":" + viewOnly
                + "}";
        String salesJson = "{\"dashboard\":" + viewOnly + ",\"products\":" + viewOnly + ",\"quality\":" + viewOnly
                + ",\"claims\":" + viewOnly + ",\"claimDashboard\":" + viewOnly + "}";
        String mfrJson = "{\"dashboard\":" + viewOnly + ",\"quality\":[\"VIEW\",\"EDIT\"],\"claims\":" + viewOnly + "}";
        String respSalesJson = "{\"dashboard\":" + viewOnly + ",\"users\":" + allActions + ",\"brands\":" + allActions
                + ",\"manufacturers\":" + allActions + ",\"salesChannels\":" + allActions + ",\"products\":"
                + allActions + ",\"quality\":" + allActions + ",\"releaseRecord\":" + allActions + ",\"claims\":"
                + allActions + ",\"claimDashboard\":" + viewOnly + "}";

        String adminPerms = "[\"AUDIT_DISCLOSE_MANAGE\",\"PRODUCT_DISCLOSE_MANAGE\",\"PRODUCT_MASTER_MANAGE\",\"DASHBOARD_QUALITY_VIEW\",\"DASHBOARD_SALES_VIEW\",\"SENSITIVE_DATA_VIEW\",\"PRODUCT_PACKAGING_VIEW\"]";
        String qualityPerms = "[\"AUDIT_DISCLOSE_MANAGE\",\"PRODUCT_DISCLOSE_MANAGE\",\"PRODUCT_MASTER_MANAGE\",\"DASHBOARD_QUALITY_VIEW\",\"SENSITIVE_DATA_VIEW\",\"PRODUCT_PACKAGING_VIEW\"]";
        String respSalesPerms = "[\"PRODUCT_MASTER_MANAGE\",\"DASHBOARD_SALES_VIEW\",\"PRODUCT_PACKAGING_VIEW\"]";

        updateOrInsertRole("ROLE_ADMIN", "시스템 관리자", "전체 시스템 관리 권한", adminJson, adminPerms);
        updateOrInsertRole("ROLE_RESPONSIBLE_SALES", "화장품책임판매관리자", "영업 및 사용자 관리 권한", respSalesJson, respSalesPerms);
        updateOrInsertRole("ROLE_QUALITY", "품질 담당자", "입고 검사 및 판정 권한", qualityJson, qualityPerms);
        updateOrInsertRole("ROLE_SALES", "영업담당자", "데이터 조회 전용", salesJson, "[\"DASHBOARD_SALES_VIEW\"]");
        updateOrInsertRole("ROLE_MANUFACTURER", "제조사 담당자", "제조사 데이터 입력 권한", mfrJson, "[]");
        updateOrInsertRole("ROLE_USER", "일반 사용자", "기본 대시보드 시청", "{\"dashboard\":[\"VIEW\"]}", "[]");
    }

    private void updateOrInsertRole(String key, String name, String desc, String menuJson, String permsJson) {
        Integer exists = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM roles WHERE role_key = ?", Integer.class,
                key);
        if (exists == null || exists == 0) {
            jdbcTemplate.update(
                    "INSERT INTO roles (role_key, display_name, description, is_system_role, allowed_menus, allowed_permissions) VALUES (?, ?, ?, ?, ?, ?)",
                    key, name, desc, true, menuJson, permsJson);
        } else {
            // Repair: Update menus/permissions if blank or null
            jdbcTemplate.update(
                    "UPDATE roles SET allowed_menus = ?, allowed_permissions = ? WHERE role_key = ? AND (allowed_menus IS NULL OR allowed_menus = '{}' OR allowed_menus = '' OR allowed_permissions IS NULL OR allowed_permissions = '[]' OR allowed_permissions = '')",
                    menuJson, permsJson, key);
        }
    }

    private void migrateProductImages() {
        try {
            jdbcTemplate.execute(
                    "INSERT INTO product_images (product_id, image_path) SELECT id, image_path FROM products WHERE image_path IS NOT NULL AND image_path <> '' AND NOT EXISTS (SELECT 1 FROM product_images WHERE product_images.product_id = products.id)");
        } catch (Exception e) {
            log.warn(">>>> [SYSTEM INIT] Image migration check skipped.");
        }
    }

    private void seedAndRepairDashboardLayouts() {
        String adminWidgets = "[\"WIDGET_NEW_PRODUCTS\",\"WIDGET_PENDING_USERS\",\"WIDGET_AUDIT_LOGS\",\"WIDGET_QUALITY_INBOUNDS\",\"WIDGET_PENDING_DIMENSIONS\",\"WIDGET_CONFIRMED_DIMENSIONS\",\"WIDGET_RECENT_CLAIMS\",\"WIDGET_MFR_COMPLETED_CLAIMS\",\"WIDGET_AUDIT_REVIEW\",\"WIDGET_AUDIT_PROGRESS\"]";
        String qualityWidgets = "[\"WIDGET_NEW_PRODUCTS\",\"WIDGET_QUALITY_INBOUNDS\",\"WIDGET_PENDING_DIMENSIONS\",\"WIDGET_CONFIRMED_DIMENSIONS\",\"WIDGET_RECENT_CLAIMS\",\"WIDGET_AUDIT_REVIEW\",\"WIDGET_AUDIT_PROGRESS\"]";
        String salesWidgets = "[\"WIDGET_NEW_PRODUCTS\",\"WIDGET_CONFIRMED_DIMENSIONS\",\"WIDGET_RECENT_CLAIMS\",\"WIDGET_MFR_COMPLETED_CLAIMS\"]";
        String mfrWidgets = "[\"WIDGET_QUALITY_INBOUNDS\",\"WIDGET_RECENT_CLAIMS\",\"WIDGET_AUDIT_PROGRESS\"]";

        updateOrInsertLayout("관리자 기본", adminWidgets, "ROLE_ADMIN");
        updateOrInsertLayout("품질팀 기본", qualityWidgets, "ROLE_QUALITY");
        updateOrInsertLayout("영업팀 기본", salesWidgets, "ROLE_SALES");
        updateOrInsertLayout("제조사 기본", mfrWidgets, "ROLE_MANUFACTURER");
    }

    private void updateOrInsertLayout(String name, String widgets, String roleKey) {
        Integer exists = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM dashboard_layouts WHERE name = ?",
                Integer.class, name);
        if (exists == null || exists == 0) {
            jdbcTemplate.update("INSERT INTO dashboard_layouts (name, widget_config) VALUES (?, ?)", name, widgets);
        }

        // Ensure role is linked to layout if not already
        jdbcTemplate.update(
                "UPDATE roles SET dashboard_layout_id = (SELECT id FROM dashboard_layouts WHERE name = ?) WHERE role_key = ? AND (dashboard_layout_id IS NULL)",
                name, roleKey);
    }

    private void seedTestUsers() {
        createIfMissing("qc", "품질담당", "더파운더즈", "ROLE_QUALITY");
        createIfMissing("qa", "QA담당", "더파운더즈", "ROLE_QUALITY");
        createIfMissing("ko", "공장장", "제조사A", "ROLE_MANUFACTURER");
        log.info(">>>> [SYSTEM INIT] Test users verified/seeded.");
    }

    private void createIfMissing(String username, String name, String company, String role) {
        if (userRepository.findByUsername(username).isEmpty()) {
            userRepository.save(User.builder()
                    .username(username)
                    .password(passwordEncoder.encode(username))
                    .name(name)
                    .companyName(company)
                    .role(role)
                    .enabled(true)
                    .build());
        }
    }

    private void seedAndRepairPageGuides() {
        log.info(">>>> [SYSTEM INIT] Seeding & Repairing Page Guides...");

        insertGuideIfMissing("DASHBOARD", "대시보드 사용 가이드",
                "[{\"title\":\"주요 지표\", \"content\":\"대시보드에서는 입고 현황, 클레임 통계 등 핵심 품질 지표를 실시간으로 확인하실 수 있습니다.\"}, {\"title\":\"위젯 설정\", \"content\":\"우측 상단 설정을 통해 개인별 맞춤 위젯 배치가 가능합니다.\"}]");
        insertGuideIfMissing("PRODUCT_LIST", "제품 관리 마스터 가이드",
                "[{\"title\":\"제품 검색\", \"content\":\"제품명, 품목코드, 제조사별로 상세 검색이 가능합니다.\"}, {\"title\":\"데이터 수정\", \"content\":\"필요한 권한이 있는 경우 제품의 규격 및 사양 정보를 직접 수정할 수 있습니다.\"}]");
        insertGuideIfMissing("CLAIM_REG", "클레임 접수 및 관리 가이드",
                "[{\"title\":\"신규 접수\", \"content\":\"클레임이 발생한 품목을 선택하고 증빙 사진(최대 5장)과 함께 접수해 주세요.\"}, {\"title\":\"처리 상태\", \"content\":\"접수 -> 검토 -> 판정 -> 조치완료 순으로 프로세스가 진행됩니다.\"}]");
        insertGuideIfMissing("QUALITY_INSPECTION", "품질 입고 검사 가이드",
                "[{\"title\":\"검사 항목\", \"content\":\"품목별로 정의된 검사 기준에 따라 양호/불량 데이터를 입력합니다.\"}, {\"title\":\"합격 판정\", \"content\":\"모든 가이드라인을 통과한 제품만 최종 입고 승인이 완료됩니다.\"}]");
    }

    private void insertGuideIfMissing(String key, String title, String sectionsJson) {
        Integer count = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM system_page_guides WHERE page_key = ?",
                Integer.class, key);
        if (count == null || count == 0) {
            jdbcTemplate.update(
                    "INSERT INTO system_page_guides (page_key, title, sections_json, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)",
                    key, title, sectionsJson);
        }
    }

    // Removed updateOrInsertGuide

    private void repairProductTableSchema() {
        log.info(">>>> [SYSTEM INIT] Aligning 'products' table schema...");
        String[] columns = {
                "version BIGINT DEFAULT 0",
                "ingredients TEXT",
                "is_parent BOOLEAN DEFAULT FALSE",
                "is_master BOOLEAN DEFAULT FALSE",
                "is_planning_set BOOLEAN DEFAULT FALSE",
                "opened_shelf_life_months INTEGER",
                "capacity_fl_oz DOUBLE PRECISION",
                "weight_oz DOUBLE PRECISION",
                "status VARCHAR(255) DEFAULT '\uAC00\uC548'", // 가안
                "dimensions_status VARCHAR(255) DEFAULT '\uAC00\uC548'", // 가안
                "photo_audit_disclosed BOOLEAN DEFAULT FALSE"
        };
        for (String col : columns) {
            String name = col.split(" ")[0];
            try {
                jdbcTemplate.execute("ALTER TABLE products ADD COLUMN IF NOT EXISTS " + col);
            } catch (Exception e) {
                log.warn(">>>> [SYSTEM INIT] Could not add column '{}' to products: {}", name, e.getMessage());
            }
        }
    }

    private void repairUserTableSchema() {
        log.info(">>>> [SYSTEM INIT] Aligning 'users' table schema...");
        String[] columns = {
                "name VARCHAR(255)",
                "company_name VARCHAR(255)",
                "department VARCHAR(255)",
                "failed_attempts INTEGER DEFAULT 0",
                "locked BOOLEAN DEFAULT FALSE",
                "password_reset_required BOOLEAN DEFAULT FALSE",
                "last_login TIMESTAMP"
        };
        for (String col : columns) {
            String name = col.split(" ")[0];
            try {
                jdbcTemplate.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS " + col);
            } catch (Exception e) {
                log.warn(">>>> [SYSTEM INIT] Could not add column '{}' to users: {}", name, e.getMessage());
            }
        }
    }

    private void repairRolesTableSchema() {
        log.info(">>>> [SYSTEM INIT] Aligning 'roles' table schema...");
        String[] columns = {
                "allowed_menus TEXT",
                "allowed_permissions TEXT",
                "dashboard_layout_id BIGINT"
        };
        for (String col : columns) {
            String name = col.split(" ")[0];
            try {
                jdbcTemplate.execute("ALTER TABLE roles ADD COLUMN IF NOT EXISTS " + col);
            } catch (Exception e) {
                log.warn(">>>> [SYSTEM INIT] Could not add column '{}' to roles: {}", name, e.getMessage());
            }
        }
    }

    private void performDataAudit() {
        try {
            Long users = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM users", Long.class);
            Long roles = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM roles", Long.class);
            Long products = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM products", Long.class);
            Long layouts = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM dashboard_layouts", Long.class);

            log.info(">>>> [SYSTEM AUDIT] users: {}, roles: {}, products: {}, layouts: {}", users, roles, products,
                    layouts);
        } catch (Exception e) {
            log.warn(">>>> [SYSTEM AUDIT] Failed to perform count audit.");
        }
    }

    private void repairAllSequences() {
        log.info(">>>> [SYSTEM INIT] Repairing AUTO_INCREMENT sequences after potential bulk inserts...");
        boolean isPostgres = env.getProperty("spring.datasource.url", "").contains("postgresql");
        
        try {
            if (isPostgres) {
                java.util.List<String> tables = jdbcTemplate.queryForList("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'", String.class);
                for (String table : tables) {
                    try {
                        Integer count = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = 'public' AND table_name = ? AND column_name = 'id'", Integer.class, table);
                        if (count != null && count > 0) {
                            jdbcTemplate.execute("SELECT setval(pg_get_serial_sequence('" + table + "', 'id'), COALESCE((SELECT MAX(id) FROM " + table + "), 0) + 1, false)");
                        }
                    } catch (Exception e) {
                        log.debug("Could not repair postgres sequence for table {}: {}", table, e.getMessage());
                    }
                }
                log.info(">>>> [SYSTEM INIT] Handled POSTGRESQL sequence repairs for {} tables.", tables.size());
            } else {
                java.util.List<String> tables = jdbcTemplate.queryForList("SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = 'PUBLIC' AND TABLE_TYPE = 'BASE TABLE'", String.class);
                for (String table : tables) {
                    try {
                        Integer count = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = 'PUBLIC' AND TABLE_NAME = ? AND COLUMN_NAME = 'ID'", Integer.class, table);
                        if (count != null && count > 0) {
                            jdbcTemplate.execute("ALTER TABLE " + table + " ALTER COLUMN ID RESTART WITH (SELECT COALESCE(MAX(ID), 0) + 1 FROM " + table + ")");
                        }
                    } catch (Exception e) {
                        log.debug("Could not repair h2 sequence for table {}: {}", table, e.getMessage());
                    }
                }
                log.info(">>>> [SYSTEM INIT] Handled H2 sequence repairs for {} tables.", tables.size());
            }
        } catch (Exception e) {
            log.warn(">>>> [SYSTEM INIT] Failed to repair sequences: {}", e.getMessage());
        }
    }
}
