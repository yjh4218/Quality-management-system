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
}
