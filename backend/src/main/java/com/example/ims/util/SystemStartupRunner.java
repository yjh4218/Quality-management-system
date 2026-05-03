package com.example.ims.util;

import com.example.ims.entity.User;
import com.example.ims.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Consolidated Ultra-Safe Startup Runner.
 * Handles Schema Synchronization followed by Essential Data Seeding.
 * Wrapped in global try-catch to prevent application crash on Render.
 */
@Component
@RequiredArgsConstructor
@Slf4j
@Order(1)
@org.springframework.boot.autoconfigure.condition.ConditionalOnProperty(name = "com.example.ims.util.SystemStartupRunner.enabled", havingValue = "true", matchIfMissing = true)
public class SystemStartupRunner implements CommandLineRunner {

    private final JdbcTemplate jdbcTemplate;
    private final com.example.ims.service.SystemInitializationService initializationService;

    @org.springframework.beans.factory.annotation.Value("${ADMIN_INITIAL_PASSWORD:}")
    private String adminInitialPassword;

    @Override
    public void run(String... args) {
        log.info(">>>> [SYSTEM STARTUP] Main thread starting. Port listening will follow context refresh.");
        
        // Run in background to prevent blocking the main Spring context thread
        java.util.concurrent.CompletableFuture.runAsync(() -> {
            try {
                log.info(">>>> [SYSTEM STARTUP] Starting Background Initialization Flow...");
                // 0. Pre-check: Ensure DB is reachable
                if (!isDatabaseReachable()) {
                    log.error(">>>> [SYSTEM STARTUP] [ERROR] Database is not reachable. Background tasks partially skipped.");
                }

                // 0.1 Security Check
                if (adminInitialPassword == null || adminInitialPassword.trim().isEmpty() || "admin".equals(adminInitialPassword)) {
                    log.warn(">>>> [SYSTEM STARTUP] [SECURITY] Insecure ADMIN_INITIAL_PASSWORD detected.");
                }

                initializationService.seedAndRepairData(adminInitialPassword);
                log.info(">>>> [SYSTEM STARTUP] [SUCCESS] Background initialization complete.");
            } catch (Exception e) {
                log.error(">>>> [SYSTEM STARTUP] [CRITICAL] Background Flow error: {}", e.getMessage(), e);
            }
        });
        
        log.info(">>>> [SYSTEM STARTUP] Main thread released. Tomcat should now be listening for Health Checks.");
    }

    private boolean isDatabaseReachable() {
        try {
            jdbcTemplate.queryForObject("SELECT 1", Integer.class);
            return true;
        } catch (Exception e) {
            log.warn("Database connection check failed: {}", e.getMessage());
            return false;
        }
    }
}
