package com.example.ims.sync;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@Slf4j
public class DataSyncDownService {

    private final JdbcTemplate h2JdbcTemplate;
    private final JdbcTemplate supabaseJdbcTemplate;

    public DataSyncDownService(
            JdbcTemplate h2JdbcTemplate,
            @Qualifier("supabaseJdbcTemplate") JdbcTemplate supabaseJdbcTemplate) {
        this.h2JdbcTemplate = h2JdbcTemplate;
        this.supabaseJdbcTemplate = supabaseJdbcTemplate;
    }

    private static final String[] TABLES = {
            "roles", "dashboard_layouts", "users", "system_page_guides",
            "manufacturers", "brands", "sales_channels", "bom_categories",
            "master_packaging_materials", "packaging_method_templates",
            "products", "product_components", "product_ingredients",
            "product_images", "product_sales_channels", "product_packaging_certificates",
            "packaging_specifications", "packaging_spec_bom_items",
            "channel_packaging_rules", "channel_sticker_images",
            "quality_reports", "wms_inbound", "wms_inbound_history",
            "claims", "claim_photos", "claim_history",
            "production_audit", "production_audit_history",
            "audit_logs", "manufacturer_files", "master_packaging_material_layers",
            "packaging_materials", "packaging_method_template_steps",
            "packaging_requests", "palette_types", "pallet_info",
            "product_history", "product_types"
    };

    @Transactional
    public void syncDownAll() {
        log.info(">>>> [SYNC-DOWN] Starting full data migration from Supabase to H2...");

        try {
            // 1. Disable constraints in H2
            h2JdbcTemplate.execute("SET REFERENTIAL_INTEGRITY FALSE");

            for (String table : TABLES) {
                try {
                    syncTable(table);
                } catch (Exception e) {
                    log.error(">>>> [SYNC-DOWN] Failed to sync table {}: {}", table, e.getMessage());
                    // Skip or throw based on preference. Here we throw to be safe.
                    throw e; 
                }
            }

            // 3. Re-enable constraints
            h2JdbcTemplate.execute("SET REFERENTIAL_INTEGRITY TRUE");
            log.info(">>>> [SYNC-DOWN] Full migration completed successfully.");

        } catch (Exception e) {
            log.error(">>>> [SYNC-DOWN] Critical failure during migration: {}", e.getMessage(), e);
            try {
                h2JdbcTemplate.execute("SET REFERENTIAL_INTEGRITY TRUE");
            } catch (Exception ignore) {}
            throw new RuntimeException("Sync-down failed: " + e.getMessage(), e);
        }
    }

    private void syncTable(String tableName) {
        log.info(">>>> [SYNC-DOWN] Processing table: {}", tableName);

        // 0. Verify H2 table exists
        List<String> targetColumns = getTableColumns(tableName);
        if (targetColumns.isEmpty()) {
            log.warn(">>>> [SYNC-DOWN] Table {} NOT FOUND in H2. Skipping.", tableName);
            return;
        }

        // 1. Clear H2 table
        h2JdbcTemplate.execute("TRUNCATE TABLE " + tableName);

        // 2. Fetch from Supabase
        List<Map<String, Object>> rows = supabaseJdbcTemplate.queryForList("SELECT * FROM " + tableName);
        if (rows.isEmpty()) {
            log.info(">>>> [SYNC-DOWN] Table {} is empty in Supabase. Skipping.", tableName);
            return;
        }

        log.info(">>>> [SYNC-DOWN] Table {} has {} columns in H2: {}", tableName, targetColumns.size(), targetColumns);

        // 3. Filter rows to only include columns that exist in H2
        List<Map<String, Object>> filteredRows = rows.stream().map(row -> {
            Map<String, Object> filtered = new java.util.LinkedHashMap<>();
            for (String col : targetColumns) {
                String match = findKeyIgnoreCase(row, col);
                if (match != null) {
                    filtered.put(col, row.get(match));
                }
            }
            return filtered;
        }).collect(Collectors.toList());

        if (filteredRows.isEmpty() || filteredRows.get(0).isEmpty()) {
            log.warn(">>>> [SYNC-DOWN] No matching columns found for table {}. Skipping.", tableName);
            return;
        }

        // 4. Prepare Insert query
        String columnsStr = String.join(", ", filteredRows.get(0).keySet());
        String placeholders = filteredRows.get(0).keySet().stream().map(k -> "?").collect(Collectors.joining(", "));
        String sql = String.format("INSERT INTO %s (%s) VALUES (%s)", tableName, columnsStr, placeholders);

        // 5. Batch Insert into H2
        List<Object[]> batchArgs = filteredRows.stream()
                .map(row -> row.values().toArray())
                .collect(Collectors.toList());

        h2JdbcTemplate.batchUpdate(sql, batchArgs);
        log.info(">>>> [SYNC-DOWN] Migrated {} rows into table {}", rows.size(), tableName);
    }

    private List<String> getTableColumns(String tableName) {
        // H2 table names are usually uppercase in INFORMATION_SCHEMA
        return h2JdbcTemplate.queryForList(
                "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = UPPER(?) AND TABLE_SCHEMA = 'PUBLIC'",
                String.class, tableName);
    }

    private String findKeyIgnoreCase(Map<String, Object> map, String key) {
        for (String k : map.keySet()) {
            if (k.equalsIgnoreCase(key)) return k;
        }
        return null;
    }

    public List<String> getH2Tables() {
        return h2JdbcTemplate.queryForList(
                "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = 'PUBLIC'", 
                String.class);
    }

    public List<String> getSupabaseTables() {
        try {
            return supabaseJdbcTemplate.queryForList(
                    "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'", 
                    String.class);
        } catch (Exception e) {
            log.error("Failed to fetch Supabase tables", e);
            return List.of("ERROR: " + e.getMessage());
        }
    }
}
