package com.example.ims.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * [SECURITY HARDENED] 시스템 내부 진단용 컨트롤러
 * 1. ADMIN 권한 필수 (RBAC)
 * 2. 운영 환경에서의 위험한 복구 기능 제한
 * 3. 민감 정보 노출 원천 차단
 */
@RestController
@RequestMapping("/api/internal")
@RequiredArgsConstructor
@Slf4j
@PreAuthorize("hasRole('ADMIN')") // 모든 엔드포인트 관리자 전용
public class InternalDebugController {

    private final JdbcTemplate jdbcTemplate;
    private final com.example.ims.service.SystemInitializationService initializationService;

    @org.springframework.beans.factory.annotation.Value("${ADMIN_INITIAL_PASSWORD:}")
    private String adminInitialPassword;

    @GetMapping("/db-audit")
    public Map<String, Object> auditDatabase() {
        log.info("[SECURITY] Admin database audit triggered by authorized user");
        Map<String, Object> audit = new HashMap<>();
        
        try {
            // 1. Table Counts (요약 정보만 제공)
            Map<String, Long> counts = new HashMap<>();
            String[] tables = {"users", "roles", "products", "claims", "wms_inbound"};
            for (String table : tables) {
                counts.put(table, getCount(table));
            }
            audit.put("table_counts", counts);

            // 2. Admin Status Check (민감 필드 제외)
            List<Map<String, Object>> adminStatus = jdbcTemplate.queryForList(
                "SELECT username, role, enabled FROM users WHERE username = 'admin'"
            );
            audit.put("admin_account_exists", !adminStatus.isEmpty());
            audit.put("admin_enabled", !adminStatus.isEmpty() && (Boolean) adminStatus.get(0).get("enabled"));

            audit.put("status", "HEALTHY");
            audit.put("timestamp", new java.util.Date());
        } catch (Exception e) {
            log.error("Audit failed", e);
            audit.put("status", "ERROR");
        }
        
        return audit;
    }

    /**
     * [DANGER] 시스템 강제 복구 기능
     * 운영 프로파일(prod)에서는 절대 실행되지 않도록 제한
     */
    @GetMapping("/force-repair")
    public Map<String, Object> forceRepair() {
        // 코드 레벨 프로파일 체크 추가 보안
        String activeProfile = System.getProperty("spring.profiles.active", "default");
        if ("prod".equalsIgnoreCase(activeProfile)) {
            log.error("[SECURITY] COUNTER-MEASURE: Blocked force-repair in production environment!");
            return Map.of("error", "Access Denied: This operation is strictly forbidden in production.");
        }

        Map<String, Object> result = new HashMap<>();
        try {
            initializationService.seedAndRepairData(adminInitialPassword);
            result.put("status", "SUCCESS");
            result.put("message", "System repair and seeding triggered manually.");
        } catch (Exception e) {
            log.error(">>>> [FORCE REPAIR ERROR]", e);
            result.put("status", "ERROR");
        }
        return result;
    }

    @GetMapping("/check-schema")
    public List<Map<String, Object>> checkSchema() {
        log.info("[SECURITY] Schema verification by admin");
        // 핵심 테이블 존재 여부만 확인 (상세 컬럼 정보 노출 방지)
        return jdbcTemplate.queryForList(
            "SELECT table_name FROM information_schema.tables " +
            "WHERE table_schema = 'public' " +
            "AND table_name IN ('products', 'users', 'roles', 'audit_logs') "
        );
    }

    @GetMapping("/session-check")
    public Map<String, Object> sessionCheck(@org.springframework.security.core.annotation.AuthenticationPrincipal org.springframework.security.core.userdetails.UserDetails userDetails) {
        Map<String, Object> result = new HashMap<>();
        if (userDetails != null) {
            result.put("username", userDetails.getUsername());
            result.put("roles", userDetails.getAuthorities());
            result.put("session_valid", true);
        }
        return result;
    }

    private Long getCount(String table) {
        try {
            return jdbcTemplate.queryForObject("SELECT COUNT(*) FROM " + table, Long.class);
        } catch (Exception e) {
            return -1L;
        }
    }
}
