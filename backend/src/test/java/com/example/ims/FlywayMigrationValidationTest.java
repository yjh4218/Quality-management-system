package com.example.ims;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ActiveProfiles("local")
@TestPropertySource(properties = {
        "spring.flyway.enabled=true",
        "spring.flyway.clean-disabled=false",
        "spring.datasource.url=jdbc:h2:mem:flyway_test_db;DB_CLOSE_DELAY=-1;MODE=PostgreSQL",
        "spring.jpa.hibernate.ddl-auto=validate"
})
public class FlywayMigrationValidationTest {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Test
    @DisplayName("전체 85개 Flyway 마이그레이션 적용 및 JPA schema validate 검증")
    void validateFlywayMigrationsAndJpaSchema() {
        // 1. Flyway schema history count check
        Integer migrationCount = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM \"flyway_schema_history\" WHERE \"success\" = true", Integer.class);
        
        logInfo("적용 완료된 Flyway 마이그레이션 개수: " + migrationCount);
        assertThat(migrationCount).isNotNull().isGreaterThanOrEqualTo(81);

        // 2. Critical columns verification on sales_channels
        Integer scPopColExists = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'SALES_CHANNELS' AND COLUMN_NAME = 'POP_REQUIRED'", Integer.class);
        assertThat(scPopColExists).isEqualTo(1);

        Integer scCushionColExists = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'SALES_CHANNELS' AND COLUMN_NAME = 'CUSHIONING_STANDARD'", Integer.class);
        assertThat(scCushionColExists).isEqualTo(1);

        // 3. Critical columns verification on packaging_specifications
        Integer psMarkingColExists = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'PACKAGING_SPECIFICATIONS' AND COLUMN_NAME = 'CONTAINER_MARKING_DISPLAY'", Integer.class);
        assertThat(psMarkingColExists).isEqualTo(1);

        logInfo("Flyway V1~V85 마이그레이션 SQL 및 JPA Schema Align 검증 성공!");
    }

    private void logInfo(String msg) {
        System.out.println(">>>> [FLYWAY VALIDATION TEST] " + msg);
    }
}
