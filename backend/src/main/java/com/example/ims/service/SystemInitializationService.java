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
    private final MailCategoryService mailCategoryService;
    private final MailTemplateService mailTemplateService;

    @Transactional
    public void seedAndRepairData(String adminInitialPassword) {
        // Quick connection check to avoid log spam if env vars are missing
        try {
            jdbcTemplate.queryForObject("SELECT 1", Integer.class);
        } catch (Exception e) {
            log.error(">>>> [SYSTEM INIT] [ABORTED] Database is unreachable. Please check your Environment Variables (SPRING_DATASOURCE_URL, etc.) in Space Settings.");
            return;
        }

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
        
        // [추가] 메일 카테고리 및 템플릿의 안전한 초기화 (마이그레이션 적용 후 시점)
        try {
            mailCategoryService.initDefaultCategories();
            mailTemplateService.initDefaultTemplates();
            log.info(">>>> [SYSTEM INIT] Mail categories and templates seeded successfully.");
        } catch (Exception e) {
            log.error(">>>> [SYSTEM INIT] [ERROR] Failed to seed mail categories/templates: {}", e.getMessage(), e);
        }

        repairOtherTablesSchema(); // [추가] 소프트 델리트 및 기타 스키마 보정
        repairRegulatoryIngredientsTableSchema(); // Drop unique constraints/indexes on regulatory_ingredients for full sync
        seedDummyProducts(); // Seed dummy products for testing

        // Page guides are now handled entirely by Bulk Migration and use
        // SystemPageGuide entity

        repairAllSequences();
        alignProductsAndClaimsData();

        log.info(">>>> [SYSTEM INIT] Data Seeding & Repair Completed.");
        performDataAudit();
    }

    private void alignProductsAndClaimsData() {
        log.info(">>>> [SYSTEM INIT] Aligning products and claims data mapping...");
        try {
            // 0. 브랜드 정보 누락 품목 처리 ('아누아' 브랜드 매핑)
            Integer anuaBrandExists = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM brands WHERE name = '아누아'", Integer.class);
            if (anuaBrandExists == null || anuaBrandExists == 0) {
                jdbcTemplate.update("INSERT INTO brands (name, type, created_at, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)", "아누아", "화장품(스킨케어)");
                log.info(">>>> [SYSTEM INIT] Seeded '아누아' brand.");
            }
            Long anuaId = jdbcTemplate.queryForObject("SELECT id FROM brands WHERE name = '아누아' LIMIT 1", Long.class);
            if (anuaId != null) {
                int brandUpdated = jdbcTemplate.update("UPDATE products SET brand_id = ? WHERE brand_id IS NULL", anuaId);
                log.info(">>>> [SYSTEM INIT] Updated {} products with missing brand to '아누아'.", brandUpdated);
            }

            // 1. 품목코드의 브랜드명, 제조사 정보 수정 적용
            // products의 brand_id로 brands 테이블의 name을 조회하여, p.brand_name 등으로 변경하거나 null 처리를 복구
            // products 엔티티에 직접적인 String manufacturer (Deprecated) 등이 있고 연관관계 엔티티(brand_id, manufacturer_id)가 있으므로 동기화
            jdbcTemplate.execute(
                "UPDATE products p " +
                "SET p.manufacturer = (SELECT m.name FROM manufacturers m WHERE m.id = p.manufacturer_id) " +
                "WHERE p.manufacturer_id IS NOT NULL"
            );

            // 2. 클레임 정보의 품목코드 기준 제품명, 제조사 정보 동기화
            jdbcTemplate.execute(
                "UPDATE claims c " +
                "SET c.product_name = (SELECT p.product_name FROM products p WHERE p.item_code = c.item_code AND (p.is_deleted = false OR p.is_deleted IS NULL) LIMIT 1), " +
                "    c.manufacturer = (SELECT m.name FROM manufacturers m JOIN products p ON p.manufacturer_id = m.id WHERE p.item_code = c.item_code AND (p.is_deleted = false OR p.is_deleted IS NULL) LIMIT 1) " +
                "WHERE EXISTS (SELECT 1 FROM products p WHERE p.item_code = c.item_code AND (p.is_deleted = false OR p.is_deleted IS NULL))"
            );

            // 3. 클레임 품목코드 중 등록되어 있지 않은(products 테이블에 매핑되지 않는) 클레임은 논리 또는 물리 삭제 처리
            // soft delete (is_deleted = true) 규칙 적용
            int deletedCount = jdbcTemplate.update(
                "UPDATE claims c SET c.is_deleted = true, c.deleted_at = CURRENT_TIMESTAMP " +
                "WHERE NOT EXISTS (SELECT 1 FROM products p WHERE p.item_code = c.item_code AND (p.is_deleted = false OR p.is_deleted IS NULL))"
            );
            log.info(">>>> [SYSTEM INIT] Claim alignment completed. Soft-deleted {} claims without valid product code.", deletedCount);
        } catch (Exception e) {
            log.error(">>>> [SYSTEM INIT] [ERROR] Failed to align products/claims: {}", e.getMessage(), e);
        }
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
                + allActions + ",\"claimDashboard\":" + viewOnly + ",\"ingredientCompliance\":" + allActions 
                + ",\"qualityPhotoAudit\":" + allActions + ",\"announcements\":" + allActions + ",\"announcementCategories\":" + allActions 
                + ",\"notifications\":" + allActions + "}";
        String qualityJson = "{\"dashboard\":" + viewOnly + ",\"products\":" + viewOnly + ",\"quality\":" + allActions
                + ",\"releaseRecord\":" + allActions + ",\"claims\":" + allActions + ",\"claimDashboard\":" + viewOnly
                + ",\"ingredientCompliance\":" + allActions + ",\"qualityPhotoAudit\":" + allActions 
                + ",\"announcements\":" + viewOnly + ",\"announcementCategories\":" + viewOnly 
                + ",\"notifications\":" + allActions + "}";
        String salesJson = "{\"dashboard\":" + viewOnly + ",\"products\":" + viewOnly + ",\"quality\":" + viewOnly
                + ",\"claims\":" + viewOnly + ",\"claimDashboard\":" + viewOnly + ",\"announcements\":" + viewOnly 
                + ",\"notifications\":" + viewOnly + "}";
        String mfrJson = "{\"dashboard\":" + viewOnly + ",\"quality\":[\"VIEW\",\"EDIT\"],\"claims\":" + viewOnly 
                + ",\"qualityPhotoAudit\":[\"VIEW\",\"EDIT\"],\"announcements\":" + viewOnly 
                + ",\"notifications\":" + allActions + "}";
        String respSalesJson = "{\"dashboard\":" + viewOnly + ",\"users\":" + allActions + ",\"brands\":" + allActions
                + ",\"manufacturers\":" + allActions + ",\"salesChannels\":" + allActions + ",\"products\":"
                + allActions + ",\"quality\":" + allActions + ",\"releaseRecord\":" + allActions + ",\"claims\":"
                + allActions + ",\"claimDashboard\":" + viewOnly + ",\"qualityPhotoAudit\":" + allActions 
                + ",\"announcements\":" + allActions + ",\"announcementCategories\":" + allActions 
                + ",\"notifications\":" + allActions + "}";

        String adminPerms = "[\"AUDIT_DISCLOSE_MANAGE\",\"PRODUCT_DISCLOSE_MANAGE\",\"PRODUCT_MASTER_MANAGE\",\"DASHBOARD_QUALITY_VIEW\",\"DASHBOARD_SALES_VIEW\",\"SENSITIVE_DATA_VIEW\",\"PRODUCT_PACKAGING_VIEW\",\"INGREDIENT_SAFETY_VIEW\",\"ANNOUNCEMENT_ALL_VIEW\"]";
        String qualityPerms = "[\"AUDIT_DISCLOSE_MANAGE\",\"PRODUCT_DISCLOSE_MANAGE\",\"PRODUCT_MASTER_MANAGE\",\"DASHBOARD_QUALITY_VIEW\",\"SENSITIVE_DATA_VIEW\",\"PRODUCT_PACKAGING_VIEW\",\"INGREDIENT_SAFETY_VIEW\",\"ANNOUNCEMENT_ALL_VIEW\"]";
        String respSalesPerms = "[\"PRODUCT_MASTER_MANAGE\",\"DASHBOARD_SALES_VIEW\",\"PRODUCT_PACKAGING_VIEW\",\"INGREDIENT_SAFETY_VIEW\",\"ANNOUNCEMENT_ALL_VIEW\"]";

        updateOrInsertRole("ROLE_ADMIN", "시스템 관리자", "전체 시스템 관리 권한", adminJson, adminPerms);
        updateOrInsertRole("ROLE_RESPONSIBLE_SALES", "화장품책임판매관리자", "영업 및 사용자 관리 권한", respSalesJson, respSalesPerms);
        updateOrInsertRole("ROLE_QUALITY", "품질 담당자", "입고 검사 및 판정 권한", qualityJson, qualityPerms);
        updateOrInsertRole("ROLE_SALES", "영업담당자", "데이터 조회 전용", salesJson, "[\"DASHBOARD_SALES_VIEW\"]");
        updateOrInsertRole("ROLE_MANUFACTURER", "제조사 담당자", "제조사 데이터 입력 권한", mfrJson, "[]");
        updateOrInsertRole("ROLE_USER", "일반 사용자", "기본 대시보드 시청", "{\"dashboard\":[\"VIEW\"],\"announcements\":[\"VIEW\"],\"notifications\":[\"VIEW\"]}", "[]");
    }

    private void updateOrInsertRole(String key, String name, String desc, String menuJson, String permsJson) {
        Integer exists = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM roles WHERE role_key = ?", Integer.class,
                key);
        if (exists == null || exists == 0) {
            jdbcTemplate.update(
                    "INSERT INTO roles (role_key, display_name, description, is_system_role, allowed_menus, allowed_permissions) VALUES (?, ?, ?, ?, ?, ?)",
                    key, name, desc, true, menuJson, permsJson);
        } else {
            // Repair: Always update roles allowed_menus and allowed_permissions to sync default values
            jdbcTemplate.update(
                    "UPDATE roles SET allowed_menus = ?, allowed_permissions = ? WHERE role_key = ?",
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
        String adminWidgets = "[\"WIDGET_ANNOUNCEMENTS\",\"WIDGET_NEW_PRODUCTS\",\"WIDGET_PENDING_USERS\",\"WIDGET_AUDIT_LOGS\",\"WIDGET_QUALITY_INBOUNDS\",\"WIDGET_PENDING_DIMENSIONS\",\"WIDGET_CONFIRMED_DIMENSIONS\",\"WIDGET_RECENT_CLAIMS\",\"WIDGET_MFR_COMPLETED_CLAIMS\",\"WIDGET_AUDIT_REVIEW\",\"WIDGET_AUDIT_PROGRESS\"]";
        String qualityWidgets = "[\"WIDGET_ANNOUNCEMENTS\",\"WIDGET_NEW_PRODUCTS\",\"WIDGET_QUALITY_INBOUNDS\",\"WIDGET_PENDING_DIMENSIONS\",\"WIDGET_CONFIRMED_DIMENSIONS\",\"WIDGET_RECENT_CLAIMS\",\"WIDGET_AUDIT_REVIEW\",\"WIDGET_AUDIT_PROGRESS\"]";
        String salesWidgets = "[\"WIDGET_ANNOUNCEMENTS\",\"WIDGET_NEW_PRODUCTS\",\"WIDGET_CONFIRMED_DIMENSIONS\",\"WIDGET_RECENT_CLAIMS\",\"WIDGET_MFR_COMPLETED_CLAIMS\"]";
        String mfrWidgets = "[\"WIDGET_ANNOUNCEMENTS\",\"WIDGET_QUALITY_INBOUNDS\",\"WIDGET_RECENT_CLAIMS\",\"WIDGET_AUDIT_PROGRESS\"]";

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
        } else {
            jdbcTemplate.update("UPDATE dashboard_layouts SET widget_config = ? WHERE name = ?", widgets, name);
        }

        // Ensure role is linked to layout if not already
        jdbcTemplate.update(
                "UPDATE roles SET dashboard_layout_id = (SELECT id FROM dashboard_layouts WHERE name = ?) WHERE role_key = ? AND (dashboard_layout_id IS NULL)",
                name, roleKey);
    }

    private void seedTestUsers() {
        createIfMissing("qc", "품질담당", "더파운더즈", "ROLE_QUALITY");
        createIfMissing("qa", "QA담당", "더파운더즈", "ROLE_QUALITY");
        createIfMissing("ko", "공장장", "한국콜마", "ROLE_MANUFACTURER");
        
        // Ensure 'ko' company is updated to '한국콜마' if it already exists to match seeded claim manufacturers
        jdbcTemplate.update("UPDATE users SET company_name = '한국콜마' WHERE username = 'ko'");
        
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

        // 1. 모니터링 메뉴군
        insertOrUpdateGuide("dashboard", "📊 QMS 통합 대시보드 사용 설명서",
                "[{\"subtitle\":\"실시간 품질 지표 모니터링\", \"content\":\"대시보드에서는 오늘 기준의 입고 검사 현황, 클레임 통계, 불합격률 등 핵심 품질 지표를 실시간 그래프와 요약 카드로 한눈에 파악할 수 있습니다.\"}, {\"subtitle\":\"권한별 레이아웃 위젯 설정\", \"content\":\"로그인한 사용자의 역할 권한에 따라 위젯 배치가 자동으로 맞춤 설정됩니다. 주요 현황을 클릭하면 해당 정밀 모듈로 즉시 이동할 수 있습니다.\"}]");
        insertOrUpdateGuide("announcements", "📢 공지사항 및 품질 전파 가이드",
                "[{\"subtitle\":\"중요 품질 공지 등록\", \"content\":\"협력 제조사나 사내 품질 담당자들에게 품질 정보, 규제 변동 고시 등의 공지글을 올립니다.\"}, {\"subtitle\":\"공람 이력 추적\", \"content\":\"상세보기 페이지 하단에서 어떤 사용자가 언제 이 공지를 열어보고 확인(공람) 완료했는지 실시간 수집 및 현황 확인이 가능합니다.\"}]");
        insertOrUpdateGuide("notifications", "🔔 품질 통합 알림함 사용법",
                "[{\"subtitle\":\"통합 알림 수신\", \"content\":\"새로운 클레임 발생, 생산감리 피드백(승인/반려), 결재 처리 알림 등이 실시간으로 보관됩니다.\"}, {\"subtitle\":\"상태 변경 및 바로가기\", \"content\":\"알림 행을 클릭하면 해당 문서를 즉시 열어볼 수 있는 경로로 이동하며, 개별 또는 전체 읽음 처리를 수행할 수 있습니다.\"}]");

        // 2. 시스템 관리 메뉴군
        insertOrUpdateGuide("users", "👥 QMS 사용자 계정 및 권한 제어",
                "[{\"subtitle\":\"가입 요청 계정 승인\", \"content\":\"신규 가입한 사내 및 파트너사의 회사명, 부서, 직책을 확인한 뒤 정당한 승인(Approve) 절차를 거쳐 활성화 처리합니다.\"}, {\"subtitle\":\"보안 계정 잠금 해제\", \"content\":\"비밀번호 5회 연속 오입력 등으로 보안 잠금 처리된 계정의 상태를 복구하거나, 임시 비밀번호를 발급할 수 있습니다.\"}]");
        insertOrUpdateGuide("logs", "👥 시스템 감사 로그(Audit Trail) 활용",
                "[{\"subtitle\":\"데이터 변경 이력 모니터링\", \"content\":\"데이터 정합성 및 보안을 위해 누가, 언제, 어떤 데이터(제품, 클레임 등)를 변경했는지 변경 유형(CREATE, UPDATE, DELETE)별로 보관합니다.\"}, {\"subtitle\":\"이전값과 이후값 상세 비교\", \"content\":\"상세 모달을 통해 변경 이전 스냅샷과 변경 이후 스냅샷의 JSON 필드를 상세 대조하여 데이터 추적이 가능합니다.\"}]");
        insertOrUpdateGuide("roles", "🔐 역할별 세부 메뉴 권한 구성",
                "[{\"subtitle\":\"메뉴 및 기능별 권한 맵 설정\", \"content\":\"각 권한 역할(ADMIN, QUALITY, MANUFACTURER)에 접근 허용할 ALLOWED_MENUS 및 읽기/쓰기/삭제 제어 옵션을 JSON 배열로 관리합니다.\"}, {\"subtitle\":\"대시보드 레이아웃 연결\", \"content\":\"해당 직군이 로그인 시 최초 노출될 대시보드 빌더 템플릿 틀을 매핑하여 기본값으로 설정합니다.\"}]");
        insertOrUpdateGuide("guideManagement", "📖 가이드 마스터 및 도움말 관리",
                "[{\"subtitle\":\"사용자 설명서 동적 배포\", \"content\":\"화면별로 나타나는 물음표(?) 도움말 데이터를 마스터 테이블에서 실시간 편집하여 전 사용자에게 원클릭 배포합니다.\"}, {\"subtitle\":\"안내 섹션 유연한 구성\", \"content\":\"각 도움말 내부에 서브 타이틀과 세부 내용을 가진 섹션을 무제한 추가 및 순서 조정할 수 있어, 시스템 가이드를 항상 최신화합니다.\"}]");
        insertOrUpdateGuide("dashboardMgmt", "🎨 대시보드 템플릿 빌더 가이드",
                "[{\"subtitle\":\"맞춤형 대시보드 위젯 배치\", \"content\":\"클레임 점유율, 감리 진행 상황 등 시스템에 제공되는 10여 종의 분석 위젯 중 적합한 것들을 선택 조합하여 신규 템플릿을 생성합니다.\"}]");
        insertOrUpdateGuide("trashBin", "🗑️ 통합 휴지통(Soft Delete) 관리자 매뉴얼",
                "[{\"subtitle\":\"소프트 딜리트 보관 및 무결성 유지\", \"content\":\"데이터 영속성을 위해 물리적으로 정보를 즉시 삭제하지 않고 is_deleted 플래그가 세팅되어 휴지통에 보관됩니다.\"}, {\"subtitle\":\"원클릭 정합성 복구\", \"content\":\"실수로 삭제한 제품 마스터나 클레임 정보 등을 외래키 제약조건 오류 없이 정합성을 완벽하게 유지하여 안전하게 복원합니다.\"}]");
        insertOrUpdateGuide("accessLogs", "📊 상세 페이지 접속 로그 통계",
                "[{\"subtitle\":\"사용자 이동 경로 추적\", \"content\":\"사용자가 어떤 화면에서 몇 초간 체류했는지, 어떤 IP 및 웹 브라우저 환경에서 페이지 이동을 일으켰는지 접속 시간 순으로 기록합니다.\"}]");
        insertOrUpdateGuide("bugReports", "🐞 시스템 자동 버그 리포트 관리",
                "[{\"subtitle\":\"런타임 및 네트워크 에러 수집\", \"content\":\"사용자 화면에서 자바스크립트 런타임 오류나 API 500 예외가 발생할 때 전송된 상세 에러 스택, 매개변수 스냅샷을 분석합니다.\"}]");
        insertOrUpdateGuide("mailTemplates", "✉️ 메일 발송 템플릿 구성 안내",
                "[{\"subtitle\":\"품질 이벤트 알림 메일 양식\", \"content\":\"클레임 신규 발생 통보 등 상황별 이메일 내용과 치환 예약어(예: ${claimNumber})를 정의하여 자동 발송 품질을 제어합니다.\"}]");

        // 3. 제품 관리 메뉴군
        insertOrUpdateGuide("products", "📦 제품코드 마스터 상세 가이드",
                "[{\"subtitle\":\"제품 체적(Dimensions) 정보 확정\", \"content\":\"최초 등록 시 가안 상태인 물류 체적(가로, 세로, 높이, 무게 등) 정보에 대해, 완제품 실측 후 반드시 확정 상태로 변환해야 물류비가 정상 집계됩니다.\"}, {\"subtitle\":\"원부자재 및 성분 정보 관리\", \"content\":\"각 완제품의 품목 상세에 성분표와 원료 규격을 정확히 입력해 규제 준수 필터링을 활성화할 수 있습니다.\"}]");
        insertOrUpdateGuide("brands", "🏷️ 브랜드 마스터 관리자 지침",
                "[{\"subtitle\":\"브랜드 표준 유형 분류\", \"content\":\"화장품(스킨케어), 화장품(헤어케어), 공산품, 반려동물(사료), 기타로 엄격하게 브랜드를 구분하여 일치성을 유지합니다.\"}, {\"subtitle\":\"브랜드 수정 및 제품 전파\", \"content\":\"RDBMS 연관 관계에 의해 특정 브랜드명이 변경되면, 해당 브랜드를 외래키로 참조하는 모든 완제품들의 브랜드 정보가 일제히 자동 갱신됩니다.\"}]");
        insertOrUpdateGuide("ingredientCompliance", "🧪 식약처 고시 및 성분 규제 안전 검사",
                "[{\"subtitle\":\"금지/한도 원료 크롤링 대조\", \"content\":\"식약처 고시 금지 성분 및 함량 한도 성분 정보를 시스템 크롤러 데이터베이스와 매칭하여, 개발 중인 처방의 규제 위반 여부를 실시간 사전 스캔합니다.\"}]");
        insertOrUpdateGuide("bomMaster", "📄 제품 BOM 원부자재 명세서 매칭",
                "[{\"subtitle\":\"레시피 함량 정합성 검토\", \"content\":\"완제품 1개당 소요되는 원료들의 투입 함량 및 배합 백분율이 100%에 수렴하는지 배합 한도를 정밀 대조 및 계산합니다.\"}]");
        insertOrUpdateGuide("bomCategories", "🧪 BOM 원료 및 부자재 분류 체계",
                "[{\"subtitle\":\"자재 속성 계층 구성\", \"content\":\"화학 원료, 기능성 파우더, 용기, 라벨 등 BOM에 매핑할 원부자재 분류 카테고리를 체계화합니다.\"}]");

        // 4. 협력업체 관리 메뉴군
        insertOrUpdateGuide("manufacturers", "🏭 제조사 및 OEM/ODM 협력사 관리",
                "[{\"subtitle\":\"제조 공장 사양서 영속화\", \"content\":\"제조 시설의 주소, 설비 캐파(CAPA), 보유 품질 인증(CGMP, ISO 등) 등 핵심 공장 사양 정보를 마스터로 통합 보존합니다.\"}]");
        insertOrUpdateGuide("manufacturerCategories", "🏭 협력사 생산 특성 분류 마스터",
                "[{\"subtitle\":\"공장 전문 영역 세분화\", \"content\":\"스킨케어 제조, 기초색조 제조, 튜브 충전 전문 등 제조 협력사들의 생산 공정별 카테고리를 라벨링하여 관리합니다.\"}]");
        insertOrUpdateGuide("salesChannels", "🏪 유통 채널 및 판매처 관리",
                "[{\"subtitle\":\"제품 유통 판매처 연동\", \"content\":\"올리브영, 다이소, 롭스 등 각 완제품이 실제로 정식 유통되어 나가는 최종 판매망 목록을 RDBMS 채널로 매핑합니다.\"}]");

        // 5. Audit 관리 메뉴군
        insertOrUpdateGuide("manufacturerAudits", "📝 협력사 품질 정기 Audit 관리",
                "[{\"subtitle\":\"현장 평가 및 실사 수립\", \"content\":\"제조 공장의 품질 위생 등급 향상을 위한 Audit 평가 일정을 등록하고, 평가원 매핑 및 진행 상태(대기, 평가중, 완료)를 제어합니다.\"}]");
        insertOrUpdateGuide("manufacturerAuditDashboard", "📊 제조사 Audit 품질 등급 분석",
                "[{\"subtitle\":\"평가 등급 분포 분석\", \"content\":\"최근 치러진 공장별 Audit 점수를 통계 지표로 가공하여, 협력사의 강점과 취약 공정을 한눈에 비교 분석할 수 있습니다.\"}]");
        insertOrUpdateGuide("manufacturerAuditItems", "📋 Audit 체크리스트 표준 세부 문항",
                "[{\"subtitle\":\"위생/원부자재 보관 정밀 문항\", \"content\":\"Audit 평가 시 실무진이 대조할 점검 항목(예: 원료실 온도, 방충 방제 등)과 항목별 중요 가중치를 부여합니다.\"}]");

        // 6. 품질 및 생산감리 메뉴군
        insertOrUpdateGuide("qualityPhotoAudit", "📸 신제품 생산감리 프로세스",
                "[{\"subtitle\":\"공정별 생산 사진 실시간 확인\", \"content\":\"신제품 최초 생산 시, 제조사 현장 담당자가 현장 상황(배합, 칭량, 완포장) 사진을 촬영하여 시스템에 제출하는 프로세스입니다.\"}, {\"subtitle\":\"품질팀 피드백 및 변경 이력\", \"content\":\"품질팀은 사진 해상도와 라벨 부착 규격을 상세 검토하여 즉시 승인(Approve) 또는 반려(Reject) 피드백을 전달할 수 있습니다.\"}]");
        insertOrUpdateGuide("packagingTemplates", "📄 포장재 표준 사양서 템플릿",
                "[{\"subtitle\":\"박스/라벨 설계도 표준화\", \"content\":\"단상자, 용기 실크 인쇄, 아웃박스 등 사양서 양식을 미리 생성하고, 일관된 레이아웃으로 도면과 스펙 정보를 작성하도록 강제합니다.\"}]");
        insertOrUpdateGuide("packagingRules", "📦 유통 채널 적재 가이드라인",
                "[{\"subtitle\":\"채널별 포장 규정 준수\", \"content\":\"예컨대 다이소 입고 시 물류 규격(예: 번들 개수 제한, 박스 총 중량 15kg 이하 준수 등)에 맞춰 포장 적합성을 검토하고 판정합니다.\"}]");
        insertOrUpdateGuide("quality", "🧪 원재료 입고 품질 및 COA 검사",
                "[{\"subtitle\":\"시험성적서(COA) 정밀 대조\", \"content\":\"제조사로부터 제출된 시험성적서 PDF 파일 내용이 본사 내부 스펙 기준에 완전 일치하는지 정합성을 대조한 후 합격/불합격을 최종 승인합니다.\"}]");
        insertOrUpdateGuide("releaseRecord", "🚚 제품 최종 유통 출시 승인서",
                "[{\"subtitle\":\"전 공정 품질 승인 여부 스캔\", \"content\":\"성분 준수 적합, 포장재 승인 완료, COA 품질 적격 승인이 모두 확인된 최종 벌크에 대해서만 시장 출시 허가를 부여합니다.\"}]");

        // 7. 클레임 관리 메뉴군
        insertOrUpdateGuide("claims", "⚠️ 고객 품질 클레임 접수 및 분석",
                "[{\"subtitle\":\"3단계 클레임 워크플로우\", \"content\":\"1단계: 인입 클레임 등록 및 현물 증빙 사진(최대 5장) 첨부 -> 2단계: 제조 공장과의 긴밀한 협업을 통한 불량 원인 분석 -> 3단계: 향후 재발 방지를 위한 구체적 시정 조치 방안을 보고서 형태로 영속 저장합니다.\"}]");
        insertOrUpdateGuide("claimDashboard", "📊 클레임 통계 및 재발 방지 지표",
                "[{\"subtitle\":\"클레임 트렌드 및 유통 불량율\", \"content\":\"내용물 오염, 펌프 불량, 용기 깨짐 등 유형별 인입 추이와 월별 불량 추이를 시각화하여 재발율을 통계적으로 관리합니다.\"}]");

        // 8. 제조사 전용 메뉴
        insertOrUpdateGuide("manufacturerGuide", "📖 제조사 담당자 전용 업무 설명서",
                "[{\"subtitle\":\"생산감리 사진 실시간 제출 필수\", \"content\":\"제조 공장 담당자는 신제품 생산 가동 즉시, 생산감리 화면에서 공정별 현장 증빙 사진(원료 칭량, 제조 가마, 최종 완제품 등)을 시스템에 직접 촬영/업로드하여 본사의 검토 승인을 득해야 합니다.\"}, {\"subtitle\":\"수입 검사 시험성적서(COA) 첨부 필수\", \"content\":\"원부자재 및 벌크 입고 예정 건에 대해서, 공장 검사실에서 발행된 자체 시험성적서(COA) 원본 PDF 파일을 제품 입고 전에 QMS 시스템에 반드시 등록해야 본사 창고로 정상 입고 입고 처리가 허용됩니다.\"}, {\"subtitle\":\"품질 불량 클레임 피드백 의무\", \"content\":\"본사로부터 품질 불량에 따른 클레임 대응 통보를 수신하면, 24시간 이내에 본 시스템의 클레임 상세 페이지 내에서 공장 측 1차 원인 규명서 및 시정 조치 답변안을 성실히 작성하여 전송할 의무가 있습니다.\"}]");
    }

    private void insertOrUpdateGuide(String key, String title, String sectionsJson) {
        Integer count = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM system_page_guides WHERE page_key = ?",
                Integer.class, key);
        if (count == null || count == 0) {
            jdbcTemplate.update(
                    "INSERT INTO system_page_guides (page_key, title, sections_json, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)",
                    key, title, sectionsJson);
        } else {
            // 이미 존재하는 경우, sections_json에 "title"이 포함되어 있거나 새로운 시드 내용으로 덮어쓸 필요가 있는 경우
            String currentSections = jdbcTemplate.queryForObject("SELECT sections_json FROM system_page_guides WHERE page_key = ?",
                    String.class, key);
            
            // 기존 데이터의 "title" 키가 포함된 구형 구조를 마이그레이션하거나 새로운 시드로 덮어씀 (자세한 콘텐츠 배포 보장)
            if (currentSections == null || currentSections.contains("\"title\"")) {
                jdbcTemplate.update(
                        "UPDATE system_page_guides SET sections_json = ?, title = ?, updated_at = CURRENT_TIMESTAMP, updated_by = 'system' WHERE page_key = ?",
                        sectionsJson, title, key);
            }
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

    private void repairOtherTablesSchema() {
        log.info(">>>> [SYSTEM INIT] Aligning other tables (Soft Delete & Guides)...");
        
        // claims 테이블에 낙관적 락을 위한 version 컬럼 보정
        try {
            jdbcTemplate.execute("ALTER TABLE claims ADD COLUMN IF NOT EXISTS version BIGINT DEFAULT 0");
            jdbcTemplate.update("UPDATE claims SET version = 0 WHERE version IS NULL");
        } catch (Exception e) {
            log.warn(">>>> [SYSTEM INIT] Could not add version column to claims: {}", e.getMessage());
        }
        
        // 1. 공통 소프트 델리트 컬럼 추가 (is_deleted, deleted_at)
        String[] softDeleteTables = {
            "products", "wms_inbound", "claims", "production_audit", 
            "manufacturer_audits", "audit_templates", "audit_template_items"
        };
        
        for (String table : softDeleteTables) {
            try {
                jdbcTemplate.execute("ALTER TABLE " + table + " ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE");
                jdbcTemplate.execute("ALTER TABLE " + table + " ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP");
                // 기존 데이터 중 NULL인 경우 FALSE로 보정 (SQLRestriction 필터링 누락 방지)
                jdbcTemplate.update("UPDATE " + table + " SET is_deleted = FALSE WHERE is_deleted IS NULL");
                
                // [추가] active/is_active 컬럼 보정 (조회 누락 방지)
                try {
                    jdbcTemplate.execute("ALTER TABLE " + table + " ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT TRUE");
                } catch (Exception e) {}
                try {
                    jdbcTemplate.execute("ALTER TABLE " + table + " ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE");
                } catch (Exception e) {}
                
                jdbcTemplate.update("UPDATE " + table + " SET active = TRUE WHERE active IS NULL");
                jdbcTemplate.update("UPDATE " + table + " SET is_active = TRUE WHERE is_active IS NULL");
            } catch (Exception e) {
                log.warn(">>>> [SYSTEM INIT] Could not repair soft delete/active for table '{}': {}", table, e.getMessage());
            }
        }
        
        // 2. system_page_guides 및 brands 컬럼 추가
        try {
            jdbcTemplate.execute("ALTER TABLE brands ADD COLUMN IF NOT EXISTS type VARCHAR(100) DEFAULT '기타'");
            jdbcTemplate.execute("ALTER TABLE system_page_guides ADD COLUMN IF NOT EXISTS content TEXT");
            jdbcTemplate.execute("ALTER TABLE system_page_guides ADD COLUMN IF NOT EXISTS updated_by VARCHAR(255)");
            jdbcTemplate.execute("ALTER TABLE system_page_guides ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP");
        } catch (Exception e) {
            log.warn(">>>> [SYSTEM INIT] Could not repair system_page_guides or brands table: {}", e.getMessage());
        }

        // 3. 전체공지 일련번호 시퀀스 보정
        try {
            jdbcTemplate.execute("CREATE SEQUENCE IF NOT EXISTS announcement_number_seq START WITH 1 INCREMENT BY 1");
            log.info(">>>> [SYSTEM INIT] announcement_number_seq sequence verified/created.");
        } catch (Exception e) {
            log.warn(">>>> [SYSTEM INIT] Could not create announcement_number_seq sequence: {}", e.getMessage());
        }

        // 4. 통합 알림 일련번호 시퀀스 보정
        try {
            jdbcTemplate.execute("CREATE SEQUENCE IF NOT EXISTS notification_number_seq START WITH 1 INCREMENT BY 1");
            log.info(">>>> [SYSTEM INIT] notification_number_seq sequence verified/created.");
        } catch (Exception e) {
            log.warn(">>>> [SYSTEM INIT] Could not create notification_number_seq sequence: {}", e.getMessage());
        }
    }

    private void performDataAudit() {
        try {
            Long users = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM users", Long.class);
            Long roles = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM roles", Long.class);
            Long products = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM products", Long.class);
            Long layouts = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM dashboard_layouts", Long.class);
            Long packagingSpecs = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM packaging_specifications", Long.class);

            log.info(">>>> [SYSTEM AUDIT] users: {}, roles: {}, products: {}, layouts: {}, packagingSpecs: {}", users, roles, products,
                    layouts, packagingSpecs);
            if (packagingSpecs > 0) {
                java.util.List<java.util.Map<String, Object>> latestSpecs = jdbcTemplate.queryForList(
                    "SELECT ps.id, p.item_code, p.product_name, ps.version, ps.last_modified_by FROM packaging_specifications ps JOIN products p ON ps.product_id = p.id ORDER BY ps.last_modified_at DESC LIMIT 5"
                );
                log.info(">>>> [SYSTEM AUDIT] Latest packaging specifications: {}", latestSpecs);
            }
        } catch (Exception e) {
            log.warn(">>>> [SYSTEM AUDIT] Failed to perform count audit: {}", e.getMessage());
        }
    }

    public void repairAllSequences() {
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

    private void repairRegulatoryIngredientsTableSchema() {
        log.info(">>>> [SYSTEM INIT] Aligning 'regulatory_ingredients' unique constraints...");
        String[] dropStatements = {
            // PostgreSQL default constraint
            "ALTER TABLE regulatory_ingredients DROP CONSTRAINT IF EXISTS regulatory_ingredients_inci_name_key",
            // Hibernate auto-generated constraints
            "ALTER TABLE regulatory_ingredients DROP CONSTRAINT IF EXISTS uk_380bierkp83sbnh6w1e3j74nt",
            "ALTER TABLE regulatory_ingredients DROP CONSTRAINT IF EXISTS uk380bierkp83sbnh6w1e3j74nt",
            "ALTER TABLE regulatory_ingredients DROP CONSTRAINT IF EXISTS \"UK_380BIERKP83SBNH6W1E3J74NT\"",
            // Drop indexes
            "DROP INDEX IF EXISTS uk_380bierkp83sbnh6w1e3j74nt",
            "DROP INDEX IF EXISTS uk380bierkp83sbnh6w1e3j74nt",
            "DROP INDEX IF EXISTS \"UK_380BIERKP83SBNH6W1E3J74NT\"",
            "DROP INDEX IF EXISTS \"UK_380BIERKP83SBNH6W1E3J74NT_INDEX_C\""
        };
        for (String sql : dropStatements) {
            try {
                jdbcTemplate.execute(sql);
            } catch (Exception e) {
                log.debug(">>>> [SYSTEM INIT] Dropping unique constraint/index skipped: {} ({})", sql, e.getMessage());
            }
        }
    }
    private void seedDummyProducts() {
        log.info(">>>> [SYSTEM INIT] Seeding Dummy Products for testing...");
        try {
            Integer brandCount = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM brands", Integer.class);
            if (brandCount == null || brandCount == 0) {
                jdbcTemplate.update("INSERT INTO brands (name) VALUES (?)", "더파운더즈");
            }

            Integer productCount = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM products", Integer.class);
            if (productCount == null || productCount == 0) {
                Long brandId = jdbcTemplate.queryForObject("SELECT id FROM brands LIMIT 1", Long.class);
                
                Integer mfrCount = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM manufacturers", Integer.class);
                if (mfrCount == null || mfrCount == 0) {
                    jdbcTemplate.update("INSERT INTO manufacturers (identification_code, manufacturer_code, name, category, contact_person, phone_number, email, active) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                            "M-2026-001", "M-2026-001", "글로벌 코스메틱", "화장품", "이영희", "010-1234-5678", "global@example.com", true);
                }
                Long mfrId = jdbcTemplate.queryForObject("SELECT id FROM manufacturers LIMIT 1", Long.class);
                
                jdbcTemplate.update(
                        "INSERT INTO products (item_code, product_name, english_product_name, brand_id, manufacturer_id, capacity, weight, status, active, is_deleted, created_at, updated_at, is_master, is_parent, is_planning_set, photo_audit_disclosed) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, ?, ?, ?, ?)",
                        "PRD-2026-001", "모이스처 수분 크림 50ml", "Moisture Cream 50ml", brandId, mfrId, "50ml", "100g", "양산", true, false, false, false, false, false
                );
                
                jdbcTemplate.update(
                        "INSERT INTO products (item_code, product_name, english_product_name, brand_id, manufacturer_id, capacity, weight, status, active, is_deleted, created_at, updated_at, is_master, is_parent, is_planning_set, photo_audit_disclosed) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, ?, ?, ?, ?)",
                        "PRD-2026-002", "안티에이징 세럼 30ml", "Anti-aging Serum 30ml", brandId, mfrId, "30ml", "80g", "가안", true, false, false, false, false, false
                );
            }
            
            // [보정] PARENT-001 부모 품목이 존재하지 않으면 추가 인서트
            Integer parentExists = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM products WHERE item_code = 'PARENT-001'", Integer.class);
            if (parentExists == null || parentExists == 0) {
                Long brandId = jdbcTemplate.queryForObject("SELECT id FROM brands LIMIT 1", Long.class);
                Long mfrId = jdbcTemplate.queryForObject("SELECT id FROM manufacturers LIMIT 1", Long.class);
                jdbcTemplate.update(
                        "INSERT INTO products (item_code, product_name, english_product_name, brand_id, manufacturer_id, capacity, weight, status, active, is_deleted, created_at, updated_at, is_master, is_parent, is_planning_set, photo_audit_disclosed) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, ?, ?, ?, ?)",
                        "PARENT-001", "기준 마스터 본품", "Master Parent Product", brandId, mfrId, "100ml", "150g", "양산", true, false, true, true, false, false
                );
                log.info(">>>> [SYSTEM INIT] Seeded 'PARENT-001' parent product.");
            }
            
            // [보정] manufacturers 테이블에 "한국콜마"가 없으면 인서트
            Integer kolmarMfrExists = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM manufacturers WHERE name = '한국콜마'", Integer.class);
            if (kolmarMfrExists == null || kolmarMfrExists == 0) {
                jdbcTemplate.update("INSERT INTO manufacturers (identification_code, manufacturer_code, name, category, contact_person, phone_number, email, active) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                        "M001", "M001", "한국콜마", "화장품", "김콜마", "010-9999-8888", "kolmar@example.com", true);
                log.info(">>>> [SYSTEM INIT] Seeded '한국콜마' manufacturer.");
            }

            // [보정] KOLMAR- 로 시작하는 제품들의 제조사 정보를 한국콜마로 자동 보정
            try {
                Long kolmarId = jdbcTemplate.queryForObject("SELECT id FROM manufacturers WHERE name = '한국콜마' LIMIT 1", Long.class);
                if (kolmarId != null) {
                    int updatedMfrId = jdbcTemplate.update("UPDATE products SET manufacturer_id = ? WHERE item_code LIKE 'KOLMAR-%' AND manufacturer_id IS NULL", kolmarId);
                    int updatedMfr = jdbcTemplate.update("UPDATE products SET manufacturer = '한국콜마' WHERE item_code LIKE 'KOLMAR-%' AND manufacturer IS NULL");
                    int updatedDisclosed = jdbcTemplate.update("UPDATE products SET photo_audit_disclosed = true WHERE item_code LIKE 'KOLMAR-%' AND photo_audit_disclosed IS NULL");
                    log.info(">>>> [SYSTEM INIT] Repaired manufacturer for KOLMAR products. updatedMfrId: {}, updatedMfr: {}, updatedDisclosed: {}", updatedMfrId, updatedMfr, updatedDisclosed);
                }
            } catch (Exception e) {
                log.warn(">>>> [SYSTEM INIT] Could not repair KOLMAR products manufacturer: {}", e.getMessage());
            }

            // [보정] products 테이블의 공란들 채우기
            try {
                jdbcTemplate.update(
                    "UPDATE products SET " +
                    "english_product_name = COALESCE(english_product_name, 'Premium Centella Cleanser'), " +
                    "has_inbox = COALESCE(has_inbox, true), " +
                    "opened_shelf_life_months = COALESCE(opened_shelf_life_months, 12), " +
                    "shelf_life_months = COALESCE(shelf_life_months, 36), " +
                    "capacity = COALESCE(capacity, '150ml'), " +
                    "weight = COALESCE(weight, '180g'), " +
                    "recycle_grade = COALESCE(recycle_grade, '우수'), " +
                    "recycle_eval_no = COALESCE(recycle_eval_no, '2026-RE-009'), " +
                    "recycle_material = COALESCE(recycle_material, 'PP/LDPE'), " +
                    "parent_item_code = COALESCE(parent_item_code, 'PARENT-001'), " +
                    "inbox_quantity = COALESCE(inbox_quantity, 10), " +
                    "inbox_width = COALESCE(inbox_width, 250), " +
                    "inbox_length = COALESCE(inbox_length, 350), " +
                    "inbox_height = COALESCE(inbox_height, 150), " +
                    "inbox_weight = COALESCE(inbox_weight, 1.8), " +
                    "outbox_quantity = COALESCE(outbox_quantity, 40), " +
                    "outbox_width = COALESCE(outbox_width, 520), " +
                    "outbox_length = COALESCE(outbox_length, 370), " +
                    "outbox_height = COALESCE(outbox_height, 320), " +
                    "outbox_weight = COALESCE(outbox_weight, 8.5), " +
                    "pallet_quantity = COALESCE(pallet_quantity, 1200), " +
                    "pallet_width = COALESCE(pallet_width, 1100), " +
                    "pallet_length = COALESCE(pallet_length, 1100), " +
                    "pallet_height = COALESCE(pallet_height, 1200)"
                );
                log.info(">>>> [SYSTEM INIT] Repaired/Filled dummy data for empty product fields.");
            } catch (Exception e) {
                log.warn(">>>> [SYSTEM INIT] Could not fill empty product fields: {}", e.getMessage());
            }
        } catch (Exception e) {
            log.warn(">>>> [SYSTEM INIT] Could not seed dummy products: {}", e.getMessage());
        }
    }
}
