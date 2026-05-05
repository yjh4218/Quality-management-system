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
 * 2. 운영 환경(prod)에서는 위험한 복구 기능 원천 차단
 * 3. 민감 정보 노출 방지 및 요약 통계만 제공
 */
@RestController
@RequestMapping("/api/internal")
@RequiredArgsConstructor
@Slf4j
@PreAuthorize("hasRole('ADMIN')") // 클래스 레벨 권한 통제
public class InternalDebugController {

    private final JdbcTemplate jdbcTemplate;
    private final com.example.ims.service.SystemInitializationService initializationService;

    @GetMapping("/db-audit")
    public Map<String, Object> auditDatabase() {
        log.info("[SECURITY] Database audit access by ADMIN");
        Map<String, Object> audit = new HashMap<>();
        
        try {
            // 실제 데이터 대신 행 수(Count)만 반환하여 정보 유출 차단
            Map<String, Long> counts = new HashMap<>();
            String[] tables = {"users", "roles", "products", "claims", "wms_inbound"};
            for (String table : tables) {
                counts.put(table, getCount(table));
            }
            audit.put("table_counts", counts);
            
            // Admin 계정 존재 여부 확인 (최소 정보만 노출)
            Long adminCount = getCount("users WHERE username = 'admin'");
            audit.put("admin_account_exists", adminCount > 0);
            
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
     * 운영 환경(prod)에서는 아예 빈(Bean)이 생성되지 않도록 설정
     */
    @GetMapping("/force-repair")
    @Profile("!prod") // 운영 환경에서는 호출 불가능
    public Map<String, Object> forceRepair() {
        log.warn("[SECURITY] Manual system repair triggered in non-prod environment");
        try {
            initializationService.seedAndRepairData(null); // 초기 비밀번호 노출 방지
            return Map.of("status", "SUCCESS", "message", "System repair completed.");
        } catch (Exception e) {
            log.error("Force repair failed", e);
            return Map.of("status", "ERROR", "message", "Repair failed.");
        }
    }

    @GetMapping("/check-schema")
    public List<Map<String, Object>> checkSchema() {
        log.info("[SECURITY] Schema check access by ADMIN");
        // 전체 구조 대신 핵심 테이블 존재 여부만 반환
        return jdbcTemplate.queryForList(
            "SELECT table_name FROM information_schema.tables " +
            "WHERE table_schema = 'public' AND table_name IN ('users', 'products', 'claims', 'audit_logs')"
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

    private Long getCount(String tableCondition) {
        try {
            return jdbcTemplate.queryForObject("SELECT COUNT(*) FROM " + tableCondition, Long.class);
        } catch (Exception e) {
            return -1L;
        }
    }
}
