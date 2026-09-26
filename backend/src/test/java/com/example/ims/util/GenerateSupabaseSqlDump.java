package com.example.ims.util;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import javax.sql.DataSource;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.sql.*;
import java.text.SimpleDateFormat;
import java.util.*;

@SpringBootTest(properties = {
    "com.example.ims.util.SystemStartupRunner.enabled=false",
    "spring.flyway.enabled=false"
})
public class GenerateSupabaseSqlDump {

    @Autowired
    private DataSource dataSource;

    @Test
    public void generateDump() throws Exception {
        System.out.println(">>>> [SQL EXPORT] Starting Full Database Dump for Supabase SQL Editor...");

        File outputFile = new File("supabase_restore_business_data.sql");
        File ingredientsFile = new File("supabase_restore_regulatory_ingredients.sql");

        try (Connection conn = dataSource.getConnection();
             PrintWriter outBusiness = new PrintWriter(new OutputStreamWriter(new FileOutputStream(outputFile), StandardCharsets.UTF_8));
             PrintWriter outIngredients = new PrintWriter(new OutputStreamWriter(new FileOutputStream(ingredientsFile), StandardCharsets.UTF_8))) {

            // Header: Disable foreign keys during import
            writeHeader(outBusiness, "QMS Business Core Data (Products, Specs, Claims, Audits, Users, etc.)");
            writeHeader(outIngredients, "QMS Regulatory Ingredients Data (28,000+ rows)");

            // Tables to dump
            List<String> businessTables = List.of(
                "roles",
                "users",
                "brands",
                "manufacturers",
                "sales_channels",
                "channel_note_categories",
                "channel_special_notes",
                "bom_categories",
                "master_packaging_materials",
                "packaging_method_templates",
                "packaging_method_template_steps",
                "packaging_method_images",
                "products",
                "product_components",
                "product_sales_channels",
                "product_ingredients",
                "product_images",
                "packaging_specifications",
                "packaging_spec_components",
                "audit_templates",
                "audit_template_groups",
                "audit_template_items",
                "production_audit",
                "claims",
                "wms_inbound",
                "wms_inbound_history",
                "system_page_guides",
                "mail_categories",
                "mail_templates",
                "document_requirements",
                "dashboard_layouts",
                "bug_reports",
                "audit_logs",
                "access_logs",
                "system_settings",
                "notification_settings",
                "stored_files"
            );

            List<String> ingredientsTables = List.of(
                "ingredient_limit_details",
                "regulatory_ingredients",
                "ingredient_regulation_histories"
            );

            // Step 1: Truncate business tables cleanly
            outBusiness.println("-- 1. Truncate target business tables (clean state)");
            for (String table : businessTables) {
                if (tableExists(conn, table)) {
                    outBusiness.printf("TRUNCATE TABLE \"%s\" RESTART IDENTITY CASCADE;%n", table.toLowerCase());
                }
            }
            outBusiness.println();

            // Step 2: Dump Business Tables Data
            outBusiness.println("-- 2. Insert Business Records");
            for (String table : businessTables) {
                dumpTable(conn, table, outBusiness);
            }

            // Step 3: Resynchronize PostgreSQL Auto-increment sequences for business tables
            outBusiness.println();
            outBusiness.println("-- 3. Resynchronize PostgreSQL ID Sequences");
            for (String table : businessTables) {
                if (hasIdColumn(conn, table)) {
                    outBusiness.printf(
                        "SELECT setval(pg_get_serial_sequence('\"%s\"', 'id'), COALESCE(MAX(id), 1), true) FROM \"%s\";%n",
                        table.toLowerCase(), table.toLowerCase()
                    );
                }
            }

            // Step 4: Dump Regulatory Ingredients Data to separate file
            outIngredients.println("-- 1. Truncate regulatory tables");
            for (String table : ingredientsTables) {
                if (tableExists(conn, table)) {
                    outIngredients.printf("TRUNCATE TABLE \"%s\" RESTART IDENTITY CASCADE;%n", table.toLowerCase());
                }
            }
            outIngredients.println();
            outIngredients.println("-- 2. Insert Regulatory Records");
            for (String table : ingredientsTables) {
                dumpTable(conn, table, outIngredients);
            }
            outIngredients.println();
            outIngredients.println("-- 3. Resynchronize Regulatory ID Sequences");
            for (String table : ingredientsTables) {
                if (hasIdColumn(conn, table)) {
                    outIngredients.printf(
                        "SELECT setval(pg_get_serial_sequence('\"%s\"', 'id'), COALESCE(MAX(id), 1), true) FROM \"%s\";%n",
                        table.toLowerCase(), table.toLowerCase()
                    );
                }
            }

            // Footers
            writeFooter(outBusiness);
            writeFooter(outIngredients);
        }

        System.out.println(">>>> [SQL EXPORT] SUCCESS!");
        System.out.println("   - Business Data File: " + outputFile.getAbsolutePath() + " (" + outputFile.length() + " bytes)");
        System.out.println("   - Ingredients Data File: " + ingredientsFile.getAbsolutePath() + " (" + ingredientsFile.length() + " bytes)");
    }

    private void writeHeader(PrintWriter out, String title) {
        out.println("-- ========================================================");
        out.println("-- QMS Database Restore Script for Supabase PostgreSQL");
        out.println("-- Title: " + title);
        out.println("-- Generated: " + new SimpleDateFormat("yyyy-MM-dd HH:mm:ss").format(new java.util.Date()));
        out.println("-- ========================================================");
        out.println();
        out.println("-- Disable Foreign Key checks for fast & safe bulk loading");
        out.println("SET session_replication_role = 'replica';");
        out.println();
    }

    private void writeFooter(PrintWriter out) {
        out.println();
        out.println("-- Re-enable Foreign Key checks");
        out.println("SET session_replication_role = 'origin';");
        out.println();
        out.println("-- Restore Completed Successfully!");
    }

    private boolean tableExists(Connection conn, String tableName) {
        try (PreparedStatement ps = conn.prepareStatement(
            "SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = 'PUBLIC' AND UPPER(TABLE_NAME) = ?")) {
            ps.setString(1, tableName.toUpperCase());
            try (ResultSet rs = ps.executeQuery()) {
                return rs.next();
            }
        } catch (Exception e) {
            return false;
        }
    }

    private boolean hasIdColumn(Connection conn, String tableName) {
        try (PreparedStatement ps = conn.prepareStatement(
            "SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = 'PUBLIC' AND UPPER(TABLE_NAME) = ? AND UPPER(COLUMN_NAME) = 'ID'")) {
            ps.setString(1, tableName.toUpperCase());
            try (ResultSet rs = ps.executeQuery()) {
                return rs.next();
            }
        } catch (Exception e) {
            return false;
        }
    }

    private void dumpTable(Connection conn, String tableName, PrintWriter out) throws SQLException {
        if (!tableExists(conn, tableName)) return;

        // Query H2 using upper-case unquoted table name
        String selectSql = "SELECT * FROM " + tableName.toUpperCase();
        try (Statement stmt = conn.createStatement();
             ResultSet rs = stmt.executeQuery(selectSql)) {

            ResultSetMetaData meta = rs.getMetaData();
            int colCount = meta.getColumnCount();

            List<String> colNames = new ArrayList<>();
            for (int i = 1; i <= colCount; i++) {
                colNames.add("\"" + meta.getColumnName(i).toLowerCase() + "\"");
            }
            String colListStr = String.join(", ", colNames);

            int rowCount = 0;
            out.printf("-- Table: %s%n", tableName.toLowerCase());

            org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder passwordEncoder = 
                new org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder();
            String newAdminPasswordHash = passwordEncoder.encode("QmsAdmin123!");

            while (rs.next()) {
                rowCount++;
                List<String> valList = new ArrayList<>();
                boolean isAdminUser = "users".equalsIgnoreCase(tableName) && "admin".equalsIgnoreCase(rs.getString("username"));
                for (int i = 1; i <= colCount; i++) {
                    String colName = meta.getColumnName(i).toLowerCase();
                    if (isAdminUser && "password".equals(colName)) {
                        valList.add("'" + newAdminPasswordHash + "'");
                    } else {
                        valList.add(formatSqlValue(rs, i, meta.getColumnType(i)));
                    }
                }
                out.printf("INSERT INTO \"%s\" (%s) VALUES (%s);%n", 
                    tableName.toLowerCase(), colListStr, String.join(", ", valList));
            }
            out.printf("-- Dumped %d rows from %s%n%n", rowCount, tableName.toLowerCase());
            System.out.println("   + Exported " + tableName + ": " + rowCount + " rows");
        }
    }

    private String formatSqlValue(ResultSet rs, int colIdx, int sqlType) throws SQLException {
        Object obj = rs.getObject(colIdx);
        if (obj == null) {
            return "NULL";
        }

        switch (sqlType) {
            case Types.BOOLEAN:
            case Types.BIT:
                return rs.getBoolean(colIdx) ? "TRUE" : "FALSE";

            case Types.TINYINT:
            case Types.SMALLINT:
            case Types.INTEGER:
            case Types.BIGINT:
                return String.valueOf(rs.getLong(colIdx));

            case Types.FLOAT:
            case Types.REAL:
            case Types.DOUBLE:
            case Types.NUMERIC:
            case Types.DECIMAL:
                return String.valueOf(rs.getDouble(colIdx));

            case Types.DATE:
                java.sql.Date d = rs.getDate(colIdx);
                return d == null ? "NULL" : "'" + d.toString() + "'";

            case Types.TIME:
            case Types.TIME_WITH_TIMEZONE:
                java.sql.Time t = rs.getTime(colIdx);
                return t == null ? "NULL" : "'" + t.toString() + "'";

            case Types.TIMESTAMP:
            case Types.TIMESTAMP_WITH_TIMEZONE:
                java.sql.Timestamp ts = rs.getTimestamp(colIdx);
                return ts == null ? "NULL" : "'" + ts.toString() + "'";

            case Types.BINARY:
            case Types.VARBINARY:
            case Types.LONGVARBINARY:
            case Types.BLOB:
                byte[] bytes = rs.getBytes(colIdx);
                if (bytes == null || bytes.length == 0) return "NULL";
                return "'\\x" + bytesToHex(bytes) + "'::bytea";

            default:
                // String or other text
                String str = rs.getString(colIdx);
                if (str == null) return "NULL";
                // Escape single quotes for PostgreSQL (' -> '')
                String escaped = str.replace("'", "''");
                return "'" + escaped + "'";
        }
    }

    private String bytesToHex(byte[] bytes) {
        StringBuilder sb = new StringBuilder(bytes.length * 2);
        for (byte b : bytes) {
            sb.append(String.format("%02x", b));
        }
        return sb.toString();
    }
}
