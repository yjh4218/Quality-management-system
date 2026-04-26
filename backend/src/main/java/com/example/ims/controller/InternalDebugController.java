package com.example.ims.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Temporary Production Debug Controller to audit Supabase data state.
 * SECURED by a simple check (can be extended).
 */
@RestController
@RequestMapping("/api/internal")
@RequiredArgsConstructor
@lombok.extern.slf4j.Slf4j
public class InternalDebugController {

    private final JdbcTemplate jdbcTemplate;
    private final com.example.ims.service.SystemInitializationService initializationService;

    @org.springframework.beans.factory.annotation.Value("${ADMIN_INITIAL_PASSWORD:}")
    private String adminInitialPassword;

    @GetMapping("/db-audit")
    public Map<String, Object> auditDatabase() {
        Map<String, Object> audit = new HashMap<>();
        
        try {
            // Environment Verification (Masked)
            Map<String, Object> env = new HashMap<>();
            if (adminInitialPassword == null || adminInitialPassword.isEmpty()) {
                env.put("ADMIN_INITIAL_PASSWORD", "NOT_SET");
            } else {
                String masked = adminInitialPassword.charAt(0) + "****" + adminInitialPassword.charAt(adminInitialPassword.length() - 1);
                env.put("ADMIN_INITIAL_PASSWORD", masked);
                env.put("length", adminInitialPassword.length());
            }
            audit.put("environment", env);

            // 1. Table Counts
            Map<String, Long> counts = new HashMap<>();
            counts.put("users", getCount("users"));
            counts.put("roles", getCount("roles"));
            counts.put("products", getCount("products"));
            counts.put("claims", getCount("claims"));
            counts.put("dashboard_layouts", getCount("dashboard_layouts"));
            counts.put("page_guides", getCount("page_guides"));
            counts.put("wms_inbound", getCount("wms_inbound"));
            audit.put("table_counts", counts);

            // 2. Admin User Status
            List<Map<String, Object>> adminStatus = jdbcTemplate.queryForList(
                "SELECT id, username, name, company_name, role, enabled FROM users WHERE username = 'admin'"
            );
            audit.put("admin_status", adminStatus);

            // 3. Roles Status
            List<Map<String, Object>> rolesStatus = jdbcTemplate.queryForList(
                "SELECT role_key, display_name, dashboard_layout_id FROM roles"
            );
            audit.put("roles_status", rolesStatus);

            audit.put("status", "HEALTHY");
        } catch (Exception e) {
            audit.put("status", "ERROR");
            audit.put("error", e.getMessage());
        }
        
        return audit;
    }

    @GetMapping("/force-repair")
    public Map<String, Object> forceRepair() {
        Map<String, Object> result = new HashMap<>();
        try {
            initializationService.seedAndRepairData(adminInitialPassword);
            result.put("status", "SUCCESS");
            result.put("message", "System repair and seeding triggered manually.");
        } catch (Exception e) {
            log.error(">>>> [FORCE REPAIR ERROR]", e);
            result.put("status", "ERROR");
            result.put("error", e.getMessage());
            result.put("cause", e.getCause() != null ? e.getCause().getMessage() : "Unknown");
        }
        return result;
    }

    @GetMapping("/check-schema")
    public List<Map<String, Object>> checkSchema() {
        return jdbcTemplate.queryForList(
            "SELECT table_name, column_name, data_type, is_nullable " +
            "FROM information_schema.columns " +
            "WHERE table_schema = 'public' " +
            "AND table_name IN ('products', 'users', 'roles') " +
            "ORDER BY table_name, ordinal_position"
        );
    }

    @GetMapping("/test-product-query")
    public Map<String, Object> testProductQuery() {
        Map<String, Object> result = new HashMap<>();
        try {
            List<Map<String, Object>> sample = jdbcTemplate.queryForList("SELECT id, item_code, product_name FROM products LIMIT 5");
            result.put("sample_data", sample);
            result.put("total_count", getCount("products"));
            result.put("status", "SUCCESS");
        } catch (Exception e) {
            result.put("status", "ERROR");
            result.put("message", e.getMessage());
        }
        return result;
    }

    @GetMapping("/session-check")
    public Map<String, Object> sessionCheck() {
        Map<String, Object> result = new HashMap<>();
        org.springframework.security.core.Authentication auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        
        if (auth == null || auth instanceof org.springframework.security.authentication.AnonymousAuthenticationToken) {
            result.put("authenticated", false);
            result.put("principal", "anonymous");
        } else {
            result.put("authenticated", true);
            result.put("principal", auth.getName());
            result.put("authorities", auth.getAuthorities());
            result.put("details", auth.getDetails() != null ? auth.getDetails().toString() : "null");
        }
        
        // Check if session exists in request
        try {
            jakarta.servlet.http.HttpServletRequest request = ((org.springframework.web.context.request.ServletRequestAttributes) org.springframework.web.context.request.RequestContextHolder.currentRequestAttributes()).getRequest();
            jakarta.servlet.http.HttpSession session = request.getSession(false);
            result.put("session_exists", session != null);
            if (session != null) {
                result.put("session_id", session.getId());
                result.put("session_created", new java.util.Date(session.getCreationTime()));
            }
        } catch (Exception e) {
            result.put("session_check_error", e.getMessage());
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
