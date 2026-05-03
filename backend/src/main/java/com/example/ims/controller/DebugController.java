package com.example.ims.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

/**
 * Temporary Debug Controller to check Supabase data integrity.
 * This should be removed after verification.
 */
@RestController
@RequestMapping("/api/debug")
@RequiredArgsConstructor
@org.springframework.context.annotation.Profile("local")
public class DebugController {

    private final JdbcTemplate jdbcTemplate;

    @GetMapping("/db-check")
    public Map<String, Object> checkData() {
        Map<String, Object> report = new HashMap<>();
        
        try {
            report.put("products_null_createdAt", jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM products WHERE created_at IS NULL", Integer.class));
                
            report.put("audit_log_null_modifiedAt", jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM audit_log WHERE modified_at IS NULL", Integer.class));
                
            report.put("claims_null_receiptDate", jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM claims WHERE receipt_date IS NULL", Integer.class));
                
            report.put("wms_inbound_null_date", jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM wms_inbound WHERE inbound_date IS NULL", Integer.class));
                
            report.put("status", "SUCCESS");
        } catch (Exception e) {
            report.put("status", "ERROR");
            report.put("error", e.getMessage());
        }
        
        return report;
    }
}
