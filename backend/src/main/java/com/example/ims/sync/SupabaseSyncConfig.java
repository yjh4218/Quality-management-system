package com.example.ims.sync;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.jdbc.DataSourceBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
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
            // Return a dummy datasource if not configured yet to avoid boot errors
            return DataSourceBuilder.create()
                    .url("jdbc:postgresql://localhost:5432/dummy")
                    .username("dummy")
                    .password("dummy")
                    .build();
        }
        return DataSourceBuilder.create()
                .url(url)
                .username(username)
                .password(password)
                .driverClassName("org.postgresql.Driver")
                .build();
    }

    @Bean(name = "supabaseJdbcTemplate")
    public JdbcTemplate supabaseJdbcTemplate() {
        return new JdbcTemplate(supabaseDataSource());
    }

    @Bean
    @org.springframework.context.annotation.Primary
    public JdbcTemplate jdbcTemplate(DataSource dataSource) {
        return new JdbcTemplate(dataSource);
    }
}
