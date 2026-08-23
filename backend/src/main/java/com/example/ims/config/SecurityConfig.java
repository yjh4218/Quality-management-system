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
    private final org.springframework.session.FindByIndexNameSessionRepository<? extends org.springframework.session.Session> sessionRepository;

    @Value("${cors.allowed-origins:}")
    private String allowedOrigins;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .csrf(csrf -> csrf
                        .csrfTokenRepository(org.springframework.security.web.csrf.CookieCsrfTokenRepository.withHttpOnlyFalse())
                        .csrfTokenRequestHandler(new org.springframework.security.web.csrf.CsrfTokenRequestAttributeHandler())
                        .ignoringRequestMatchers(
                                "/api/vendor-upload/**",
                                "/api/auth/login",
                                "/api/auth/register",
                                "/api/auth/check-username",
                                "/api/auth/find-password",
                                "/api/auth/verify-email",
                                "/api/admin/system/health",
                                "/api/manufacturers/invite/**",
                                "/api/bug-reports",
                                "/api/bug-reports/**",
                                "/api/logs/access/**"
                        )
                )
                .addFilterAfter(new org.springframework.web.filter.OncePerRequestFilter() {
                    @Override
                    protected void doFilterInternal(jakarta.servlet.http.HttpServletRequest request,
                                                    jakarta.servlet.http.HttpServletResponse response,
                                                    jakarta.servlet.FilterChain filterChain)
                            throws jakarta.servlet.ServletException, java.io.IOException {
                        org.springframework.security.web.csrf.CsrfToken csrfToken =
                                (org.springframework.security.web.csrf.CsrfToken) request.getAttribute(org.springframework.security.web.csrf.CsrfToken.class.getName());
                        if (csrfToken != null) {
                            csrfToken.getToken();
                        }
                        filterChain.doFilter(request, response);
                    }
                }, org.springframework.security.web.authentication.www.BasicAuthenticationFilter.class)
                .authorizeHttpRequests(auth -> auth
                        // [CORS PATCH] OPTIONS preflight 요청 무조건 허용
                        .requestMatchers(org.springframework.http.HttpMethod.OPTIONS, "/**").permitAll()
                        .requestMatchers("/error").permitAll()
                        .requestMatchers("/api/bug-reports", "/api/bug-reports/**").permitAll()
                        .requestMatchers(org.springframework.http.HttpMethod.POST, "/api/bug-reports", "/api/bug-reports/**").permitAll()
                        .requestMatchers("/api/logs/access/**", "/api/logs/access/page-move").permitAll()
                        .requestMatchers(org.springframework.http.HttpMethod.POST, "/api/logs/access/**", "/api/logs/access/page-move").permitAll()
                        // [SECURITY PATCH] 관리자 전용 시스템 경로 권한 강화
                        .requestMatchers("/api/admin/system/health").permitAll() 
                        .requestMatchers("/api/debug/**").hasRole("ADMIN")
                        .requestMatchers("/", "/api/auth/login", "/api/auth/logout").permitAll()
                        .requestMatchers("/api/auth/register", "/api/auth/check-username", "/api/auth/find-password", "/api/auth/verify-email").permitAll()
                        .requestMatchers("/api/vendor-upload/**").permitAll()
                        // Spring Boot Actuator 모니터링 엔드포인트 세분화 (health, info 공개 / 기타 민감정보 보호)
                        .requestMatchers("/actuator/health", "/actuator/info").permitAll()
                        .requestMatchers("/actuator/**").hasRole("ADMIN")
                        .requestMatchers("/api/auth/unlock/**", "/api/auth/reset-password/**").hasRole("ADMIN")
                        
                        // 로그 및 보안 관련 경로 (페이지 이동 로그 및 채널 정보는 익명/공통 접근 허용)
                        .requestMatchers("/api/logs/access/**", "/api/logs/access/page-move").permitAll()
                        .requestMatchers("/api/admin/master-data/sales-channels/**").permitAll()
                        // 버그 리포트 제출 (익명/오프라인 큐 전송 포함 무조건 허용)
                        .requestMatchers("/api/bug-reports", "/api/bug-reports/**").permitAll()
                        .requestMatchers("/api/admin/master-data/**").authenticated()
                        
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
                        .sessionRegistry(sessionRegistry()) // [보안] Spring Session(JDBC) 연동
                )
                .logout(logout -> logout
                        .logoutUrl("/api/auth/logout")
                        .invalidateHttpSession(true)
                        .clearAuthentication(true) 
                        .deleteCookies("QMS_SESSION_V2", "QMS_SESSION", "JSESSIONID", "SESSION")
                        .logoutSuccessHandler(logoutSuccessHandler)
                )
                .exceptionHandling(ex -> ex
                        .authenticationEntryPoint((request, response, authException) -> {
                            String origin = request.getHeader("Origin");
                            if (origin != null) {
                                response.setHeader("Access-Control-Allow-Origin", origin);
                                response.setHeader("Access-Control-Allow-Credentials", "true");
                                response.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, PATCH");
                                response.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type, X-Requested-With, X-XSRF-TOKEN, Accept, Origin");
                            }
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
        
        // [CORS PATCH] 설정된 Allowed Origins가 있을 경우 사용하며, 없을 시 안전한 기본 허용 패턴 적용
        List<String> originsList = Arrays.stream(allowedOrigins.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .collect(Collectors.toList());
                
        if (originsList.isEmpty()) {
            originsList = List.of(
                "http://localhost:5173",
                "http://127.0.0.1:5173",
                "https://qms-test.kro.kr",
                "https://*.kro.kr",
                "https://qualitymange.pages.dev",
                "https://*.pages.dev",
                "https://*.hf.space"
            );
        }
        
        configuration.setAllowedOriginPatterns(originsList);
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"));
        configuration.setAllowedHeaders(List.of(
            "Authorization",
            "Content-Type",
            "X-Requested-With",
            "X-XSRF-TOKEN",
            "Accept"
        ));
        configuration.setExposedHeaders(List.of("Set-Cookie", "Authorization", "XSRF-TOKEN", "X-XSRF-TOKEN"));
        configuration.setAllowCredentials(true);
        configuration.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }

    @Bean
    public org.springframework.security.core.session.SessionRegistry sessionRegistry() {
        return new org.springframework.session.security.SpringSessionBackedSessionRegistry<>(sessionRepository);
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
