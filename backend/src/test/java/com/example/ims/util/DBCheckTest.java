package com.example.ims.util;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import com.example.ims.repository.RoleRepository;
import com.example.ims.entity.Role;
import java.io.FileWriter;
import java.io.PrintWriter;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@SpringBootTest(properties = "com.example.ims.util.SystemStartupRunner.enabled=false")
@ActiveProfiles("local")
public class DBCheckTest {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private RoleRepository roleRepository;

    @Test
    public void resetLocalPasswords() {
        System.out.println("==================================================");
        System.out.println(">>>> [PASSWORD RESET] Resetting local development passwords in H2...");
        try {
            org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder encoder = 
                new org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder();
            
            int adminReset = jdbcTemplate.update(
                "UPDATE users SET password = ?, enabled = true, locked = false, failed_attempts = 0 WHERE username = 'admin'",
                encoder.encode("admin")
            );
            int qaReset = jdbcTemplate.update(
                "UPDATE users SET password = ?, enabled = true, locked = false, failed_attempts = 0 WHERE username = 'qa'",
                encoder.encode("qa")
            );
            int koReset = jdbcTemplate.update(
                "UPDATE users SET password = ?, enabled = true, locked = false, failed_attempts = 0 WHERE username = 'ko'",
                encoder.encode("ko")
            );
            
            System.out.println(String.format(">>>> [PASSWORD RESET] Success! Admin: %d, QA: %d, KO: %d", adminReset, qaReset, koReset));
        } catch (Exception e) {
            System.err.println(">>>> [PASSWORD RESET] Failed to reset passwords!");
            e.printStackTrace();
        }
        System.out.println("==================================================");
    }

    @Test
    public void checkRegulatoryIngredients() {
        System.out.println("==================================================");
        System.out.println(">>>> [REGULATORY INGREDIENTS CHECK]");
        try {
            List<Map<String, Object>> counts = jdbcTemplate.queryForList(
                "SELECT source_api, COUNT(*) as cnt FROM regulatory_ingredients GROUP BY source_api"
            );
            System.out.println(">>>> Counts by source_api:");
            for (Map<String, Object> c : counts) {
                System.out.println(String.format("   API: %s | COUNT: %s", c.get("source_api"), c.get("cnt")));
            }
            
            Integer total = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM regulatory_ingredients", Integer.class);
            System.out.println(">>>> Total ingredients: " + total);

            List<Map<String, Object>> duplicates = jdbcTemplate.queryForList(
                "SELECT inci_name, COUNT(*) as cnt FROM regulatory_ingredients WHERE inci_name IS NOT NULL GROUP BY inci_name HAVING COUNT(*) > 1 ORDER BY cnt DESC LIMIT 10"
            );
            System.out.println(">>>> Top 10 duplicate INCI names:");
            for (Map<String, Object> d : duplicates) {
                System.out.println(String.format("   INCI: %s | DUP COUNT: %s", d.get("inci_name"), d.get("cnt")));
            }
        } catch (Exception e) {
            System.err.println(">>>> Failed to query regulatory_ingredients!");
            e.printStackTrace();
        }
        System.out.println("==================================================");
    }

    @Autowired
    private com.example.ims.service.SystemInitializationService initializationService;

    @Autowired
    private com.example.ims.service.RegulatoryCrawlerService crawlerService;

    @Test
    public void runCrawlerTest() {
        System.out.println("==================================================");
        System.out.println(">>>> [RUNNING CRAWLER TEST IN JUNIT]");
        try {
            // Drop unique constraints/indexes and run database repair first
            initializationService.seedAndRepairData(null);
            // Only sync KR to see REGL + INGD
            crawlerService.syncByCountries(List.of("KR"));
        } catch (Exception e) {
            e.printStackTrace();
        }
        System.out.println("==================================================");
    }

    @Test
    public void checkTables() {
        StringBuilder sb = new StringBuilder();
        sb.append("==================================================\n");
        
        try {
            String currentSchema = jdbcTemplate.queryForObject("SELECT CURRENT_SCHEMA()", String.class);
            sb.append(">>>> [DB CHECK] Current Schema: ").append(currentSchema).append("\n");
        } catch (Exception e) {
            sb.append(">>>> [DB CHECK] Error getting current schema: ").append(e.getMessage()).append("\n");
        }

        try {
            String dbPath = jdbcTemplate.queryForObject("SELECT DATABASE_PATH()", String.class);
            sb.append(">>>> [DB CHECK] H2 Database Path: ").append(dbPath).append("\n");
        } catch (Exception e) {
            sb.append(">>>> [DB CHECK] Error getting db path: ").append(e.getMessage()).append("\n");
        }

        try {
            Integer rolesCountDef = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM roles", Integer.class);
            sb.append(">>>> [DB CHECK] COUNT(*) FROM roles (default schema): ").append(rolesCountDef).append("\n");
        } catch (Exception e) {
            sb.append(">>>> [DB CHECK] Error querying default roles: ").append(e.getMessage()).append("\n");
        }

        try {
            Integer rolesCountPub = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM public.roles", Integer.class);
            sb.append(">>>> [DB CHECK] COUNT(*) FROM public.roles (explicit public): ").append(rolesCountPub).append("\n");
        } catch (Exception e) {
            sb.append(">>>> [DB CHECK] Error querying public.roles: ").append(e.getMessage()).append("\n");
        }

        sb.append(">>>> [DB CHECK] Checking roles table...\n");
        try {
            List<Map<String, Object>> roles = jdbcTemplate.queryForList("SELECT * FROM roles");
            sb.append(">>>> [DB CHECK] Total roles in DB (via JDBC): ").append(roles.size()).append("\n");
            for (Map<String, Object> r : roles) {
                sb.append(String.format("ROLE_KEY: '%s' (len: %d) | DISPLAY: %s | ALLOWED_MENUS: %s%n",
                    r.get("role_key"), ((String)r.get("role_key")).length(), r.get("display_name"), r.get("allowed_menus")));
            }
        } catch (Exception e) {
            sb.append(">>>> [DB CHECK] Error reading roles: ").append(e.getMessage()).append("\n");
        }

        sb.append(">>>> [DB CHECK] Querying via JPA RoleRepository...\n");
        try {
            List<Role> allRoles = roleRepository.findAll();
            sb.append(">>>> [DB CHECK] [JPA] Total roles found: ").append(allRoles.size()).append("\n");
            for (Role r : allRoles) {
                sb.append(">>>> [DB CHECK] [JPA] Role: ").append(r).append("\n");
            }
            Optional<Role> adminRole = roleRepository.findByRoleKey("ROLE_ADMIN");
            if (adminRole.isPresent()) {
                sb.append(">>>> [DB CHECK] [JPA] findByRoleKey('ROLE_ADMIN'): FOUND -> ").append(adminRole.get()).append("\n");
            } else {
                sb.append(">>>> [DB CHECK] [JPA] findByRoleKey('ROLE_ADMIN'): NOT FOUND\n");
            }
        } catch (Exception e) {
            sb.append(">>>> [DB CHECK] [JPA] Error: ").append(e.getMessage()).append("\n");
            java.io.StringWriter sw = new java.io.StringWriter();
            e.printStackTrace(new java.io.PrintWriter(sw));
            sb.append(sw.toString()).append("\n");
        }

        sb.append(">>>> [DB CHECK] Direct raw connection to H2 file qmsdb...\n");
        try (java.sql.Connection conn = java.sql.DriverManager.getConnection("jdbc:h2:file:./data/qmsdb", "SA", "")) {
            try (java.sql.Statement stmt = conn.createStatement()) {
                try (java.sql.ResultSet rs = stmt.executeQuery("SELECT COUNT(*) FROM roles")) {
                    if (rs.next()) {
                        sb.append(">>>> [DB CHECK] [RAW H2] roles count: ").append(rs.getInt(1)).append("\n");
                    }
                }
            }
            try (java.sql.Statement stmt = conn.createStatement()) {
                try (java.sql.ResultSet rs = stmt.executeQuery("SELECT COUNT(*) FROM users")) {
                    if (rs.next()) {
                        sb.append(">>>> [DB CHECK] [RAW H2] users count: ").append(rs.getInt(1)).append("\n");
                    }
                }
            }
        } catch (Exception e) {
            sb.append(">>>> [DB CHECK] [RAW H2] Error: ").append(e.getMessage()).append("\n");
        }

        sb.append(">>>> [DB CHECK] Listing all H2 tables across all schemas...\n");
        try {
            List<Map<String, Object>> tables = jdbcTemplate.queryForList(
                "SELECT TABLE_SCHEMA, TABLE_NAME FROM INFORMATION_SCHEMA.TABLES"
            );
            sb.append(">>>> [DB CHECK] Total tables in H2: ").append(tables.size()).append("\n");
            for (Map<String, Object> t : tables) {
                String schema = (String) t.get("TABLE_SCHEMA");
                String name = (String) t.get("TABLE_NAME");
                if (!schema.startsWith("INFORMATION_SCHEMA") && !schema.startsWith("SYSTEM_LOB")) {
                    sb.append(String.format("SCHEMA: %s | TABLE: %s%n", schema, name));
                }
            }
        } catch (Exception e) {
            sb.append(">>>> [DB CHECK] Error listing tables: ").append(e.getMessage()).append("\n");
        }

        sb.append(">>>> [DB CHECK] Checking users table...\n");
        try {
            List<Map<String, Object>> users = jdbcTemplate.queryForList("SELECT * FROM users");
            sb.append(">>>> [DB CHECK] Total users in DB: ").append(users.size()).append("\n");
            for (Map<String, Object> u : users) {
                sb.append(String.format("USERNAME: %s | NAME: %s | ROLE: %s%n",
                    u.get("username"), u.get("name"), u.get("role")));
            }
        } catch (Exception e) {
            sb.append(">>>> [DB CHECK] Error reading users: ").append(e.getMessage()).append("\n");
        }
        sb.append("==================================================\n");

        System.out.println(sb.toString());

        try (PrintWriter out = new PrintWriter(new FileWriter("data/db_check.log"))) {
            out.print(sb.toString());
        } catch (Exception e) {
            System.err.println(">>>> [DB CHECK] Failed to write db_check.log: " + e.getMessage());
        }
    }

    @Autowired
    private com.example.ims.service.SystemSettingService systemSettingService;

    @Test
    public void printSmtpSettings() {
        System.out.println("==================================================");
        System.out.println(">>>> [SMTP SETTINGS AUDIT]");
        try {
            String host = systemSettingService.getSettingValue("SMTP_HOST");
            String port = systemSettingService.getSettingValue("SMTP_PORT");
            String username = systemSettingService.getSettingValue("SMTP_USERNAME");
            String decryptedPassword = systemSettingService.getSmtpPassword();
            String rawPasswordInDb = jdbcTemplate.queryForObject("SELECT setting_value FROM system_settings WHERE setting_key = 'SMTP_PASSWORD'", String.class);

            System.out.println("SMTP_HOST: " + host);
            System.out.println("SMTP_PORT: " + port);
            System.out.println("SMTP_USERNAME: " + username);
            System.out.println("SMTP_PASSWORD (Decrypted): " + decryptedPassword);
            System.out.println("SMTP_PASSWORD (Raw encrypted in DB): " + rawPasswordInDb);
        } catch (Exception e) {
            System.err.println(">>>> Failed to query system_settings!");
            e.printStackTrace();
        }
        System.out.println("==================================================");
    }

    @Test
    public void generateRandomWmsInboundRecords() {
        System.out.println("==================================================");
        System.out.println(">>>> [WMS INBOUND SEED] Generating random mock inbound histories...");
        try {
            // 1. Get all registered products to use registered itemCode and productName
            List<Map<String, Object>> products = jdbcTemplate.queryForList(
                "SELECT item_code, product_name FROM products"
            );
            
            if (products.isEmpty()) {
                System.out.println(">>>> [WMS INBOUND SEED] No products registered! Skipping.");
                return;
            }

            // 2. Define manufacturers
            String[] manufacturers = {"한국콜마", "코스맥스", "코스메카코리아", "씨엔에프", "아우딘퓨쳐스"};

            // 3. Overall status values
            String[] statuses = {"STEP1_WAITING", "STEP2_INBOUND_COMPLETE", "STEP3_CONTROL_CHECKING", "STEP4_CONTROL_COMPLETE", "STEP5_FINAL_COMPLETE"};

            java.util.Random rand = new java.util.Random();
            java.time.LocalDate today = java.time.LocalDate.now();

            int insertCount = 0;
            // Generate 35 mock records
            for (int i = 0; i < 35; i++) {
                Map<String, Object> product = products.get(rand.nextInt(products.size()));
                String itemCode = (String) product.get("item_code");
                String productName = (String) product.get("product_name");
                String manufacturer = manufacturers[rand.nextInt(manufacturers.length)];

                // Date within last 30 days
                java.time.LocalDate inboundDate = today.minusDays(rand.nextInt(30));
                java.time.LocalDateTime inboundDateTime = inboundDate.atTime(rand.nextInt(12) + 9, rand.nextInt(60));
                
                String grnNumber = "GRN-" + inboundDate.toString().replace("-", "") + "-" + String.format("%03d", rand.nextInt(100));
                int quantity = (rand.nextInt(49) + 2) * 100; // 200 ~ 5000 in multiples of 100
                String lotNumber = "LOT-" + inboundDate.toString().replace("-", "") + "-" + String.format("%03d", rand.nextInt(100));

                String status = statuses[rand.nextInt(statuses.length)];
                String inboundStatus = "검사 완료";
                String inboundResult = "적합";
                if ("STEP1_WAITING".equals(status)) {
                    inboundStatus = "검사 대기";
                    inboundResult = "판정 중";
                } else if ("STEP3_CONTROL_CHECKING".equals(status)) {
                    inboundStatus = "검사 중";
                    inboundResult = "판정 중";
                }

                // 성적서 파일 있을 확률 50%
                boolean hasCoa = rand.nextBoolean();
                String coaUrl = hasCoa ? "/uploads/coa_" + lotNumber + "_kor.pdf" : null;
                String coaUrlEng = (hasCoa && rand.nextBoolean()) ? "/uploads/coa_" + lotNumber + "_eng.pdf" : null;
                String coaDecisionDate = hasCoa ? inboundDate.plusDays(rand.nextInt(3) + 1).toString() : null;

                jdbcTemplate.update(
                    "INSERT INTO wms_inbound (grn_number, item_code, product_name, quantity, manufacturer, inbound_date, lot_number, expiration_date, overall_status, inbound_inspection_status, inbound_inspection_result, coa_file_url, coa_file_url_eng, coa_decision_date, is_deleted) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, false)",
                    grnNumber,
                    itemCode,
                    productName,
                    quantity,
                    manufacturer,
                    inboundDateTime,
                    lotNumber,
                    inboundDate.plusYears(3).toString(), // 3 years expiration
                    status,
                    inboundStatus,
                    inboundResult,
                    coaUrl,
                    coaUrlEng,
                    coaDecisionDate
                );
                insertCount++;
            }
            System.out.println(">>>> [WMS INBOUND SEED] Successfully inserted " + insertCount + " random inbound histories.");
        } catch (Exception e) {
            System.err.println(">>>> [WMS INBOUND SEED] Failed to generate seed data!");
            e.printStackTrace();
        }
        System.out.println("==================================================");
    }
}
