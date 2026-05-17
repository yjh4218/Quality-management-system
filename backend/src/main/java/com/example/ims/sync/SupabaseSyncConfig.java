package com.example.ims.sync;
 
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.jdbc.DataSourceBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.jdbc.core.JdbcTemplate;
 
import javax.sql.DataSource;
 
@Configuration
public class SupabaseSyncConfig {
 
    @Value("${supabase.datasource.url:}")
    private String url;
 
    @Value("${supabase.datasource.username:}")
    private String username;
 
    @Value("${supabase.datasource.password:}")
    private String password;
 
    private DataSource supabaseDataSource() {
        if (url == null || url.isEmpty()) {
            // Return a non-pooling dummy datasource to prevent HikariCP eager connection failures
            org.springframework.jdbc.datasource.DriverManagerDataSource dummy = new org.springframework.jdbc.datasource.DriverManagerDataSource();
            dummy.setDriverClassName("org.postgresql.Driver");
            dummy.setUrl("jdbc:postgresql://localhost:5432/dummy");
            dummy.setUsername("dummy");
            dummy.setPassword("dummy");
            return dummy;
        }
        return DataSourceBuilder.create()
                .url(url)
                .username(username)
                .password(password)
                .driverClassName("org.postgresql.Driver")
                .build();
    }
 
    @Primary
    @Bean(name = "jdbcTemplate")
    public JdbcTemplate primaryJdbcTemplate(DataSource dataSource) {
        return new JdbcTemplate(dataSource);
    }
 
    @Bean(name = "supabaseJdbcTemplate")
    public JdbcTemplate supabaseJdbcTemplate() {
        return new JdbcTemplate(supabaseDataSource());
    }
}
