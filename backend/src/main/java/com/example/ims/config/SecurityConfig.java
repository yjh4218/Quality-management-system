package com.example.ims.config;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpStatus;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import org.springframework.beans.factory.annotation.Value;
import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final CustomAuthenticationFailureHandler failureHandler;
    private final CustomAuthenticationSuccessHandler successHandler;
    private final CustomLogoutSuccessHandler logoutSuccessHandler;

    @Value("${cors.allowed-origins:}")
    private String allowedOrigins;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .csrf(AbstractHttpConfigurer::disable) 
                .authorizeHttpRequests(auth -> auth
                        // [SECURITY PATCH] 관리자 전용 시스템 경로 권한 강화
                        .requestMatchers("/api/admin/system/health").permitAll() 
                        .requestMatchers("/", "/api/auth/login", "/api/auth/logout").permitAll()
                        .requestMatchers("/api/auth/register", "/api/auth/check-username", "/api/auth/find-password", "/api/auth/verify-email").permitAll()
                        .requestMatchers("/api/auth/unlock/**", "/api/auth/reset-password/**").hasRole("ADMIN")
                        
                        // 로그 및 보안 관련 경로 관리자 보호 (Controller에서 @PreAuthorize로 정밀 제어)
                        .requestMatchers("/api/logs/access/page-move").authenticated()
                        .requestMatchers("/api/logs/access/**").authenticated()
                        .requestMatchers("/api/logs/**").authenticated()
                        .requestMatchers(org.springframework.http.HttpMethod.POST, "/api/bug-reports").authenticated()
                        .requestMatchers("/api/bug-reports/**").authenticated()
                        
                        .requestMatchers("/api/admin/system/**").hasRole("ADMIN")
                        .requestMatchers("/api/admin/trash/**").hasRole("ADMIN")
                        
                        .requestMatchers("/api/audit-templates/**").authenticated()
                        
                        .anyRequest().authenticated()
                )
                .formLogin(form -> form
                        .loginProcessingUrl("/api/auth/login")
                        .successHandler(successHandler)
                        .failureHandler(failureHandler)
                        .permitAll()
                )
                .sessionManagement(session -> session
                        .sessionFixation().migrateSession() // [보안] 세션 고정 보호 강화
                        .maximumSessions(5) // [추가] 동시 세션 제한 추가
                )
                .logout(logout -> logout
                        .logoutUrl("/api/auth/logout")
                        .invalidateHttpSession(true)
                        .clearAuthentication(true) 
                        .deleteCookies("QMS_SESSION", "JSESSIONID", "SESSION")
                        .logoutSuccessHandler(logoutSuccessHandler)
                )
                .exceptionHandling(ex -> ex
                        .authenticationEntryPoint((request, response, authException) -> {
                            response.setStatus(HttpStatus.UNAUTHORIZED.value());
                            response.setContentType("application/json;charset=UTF-8");
                            // [SECURITY PATCH] 내부 예외 메시지 노출 차단
                            response.getWriter().write("{\"error\": \"Unauthorized\", \"message\": \"인증이 필요합니다.\"}");
                        })
                )
                .httpBasic(AbstractHttpConfigurer::disable);

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        
        // [CORS PATCH] 명시적 허용 목록 사용 (와일드카드 제거)
        if (allowedOrigins != null && !allowedOrigins.trim().isEmpty()) {
            configuration.setAllowedOrigins(Arrays.stream(allowedOrigins.split(","))
                    .map(String::trim)
                    .collect(Collectors.toList()));
        } else {
            // 로컬 개발 환경 및 기본 배포 환경 폴백 (안전한 기본값)
            configuration.setAllowedOrigins(List.of(
                "http://localhost:3000",
                "http://localhost:5173",
                "http://127.0.0.1:5173"
            ));
            // 개발/스테이징 보조 패턴 허용
            configuration.addAllowedOriginPattern("https://*.hf.space");
            configuration.addAllowedOriginPattern("https://*.onrender.com");
            configuration.addAllowedOriginPattern("https://qualitymange.pages.dev");
        }

        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"));
        configuration.setAllowedHeaders(List.of("Authorization", "Content-Type", "X-Requested-With", "Accept", "Origin"));
        configuration.setExposedHeaders(List.of("Set-Cookie", "Authorization"));
        configuration.setAllowCredentials(true);
        configuration.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
