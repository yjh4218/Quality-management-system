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
                                "/api/**",
                                "/actuator/**"
                        )
                )
                // [DEC-08 / D-1 해결] HF 배포 무영향 Origin/Referer 무결성 가드 필터
                // Cross-Origin 환경에서 403 장애를 유발하는 CSRF 토큰 강제 적용 대신,
                // 허용되지 않은 외부 사이트로부터의 위조된 상태 변경(POST/PUT/DELETE/PATCH) 요청을 원천 차단
                .addFilterBefore(new org.springframework.web.filter.OncePerRequestFilter() {
                    @Override
                    protected void doFilterInternal(jakarta.servlet.http.HttpServletRequest request,
                                                    jakarta.servlet.http.HttpServletResponse response,
                                                    jakarta.servlet.FilterChain filterChain)
                            throws jakarta.servlet.ServletException, java.io.IOException {
                        String method = request.getMethod();
                        String uri = request.getRequestURI();

                        if (("POST".equalsIgnoreCase(method) || "PUT".equalsIgnoreCase(method) ||
                             "DELETE".equalsIgnoreCase(method) || "PATCH".equalsIgnoreCase(method)) &&
                             uri.startsWith("/api/")) {

                            // 비인가 익명 허용 공개 API는 검증 예외
                            if (!uri.startsWith("/api/auth/login") && !uri.startsWith("/api/auth/register") &&
                                !uri.startsWith("/api/auth/find-password") && !uri.startsWith("/api/auth/verify-email") &&
                                !uri.startsWith("/api/bug-reports") && !uri.startsWith("/api/logs/access") &&
                                !uri.startsWith("/api/vendor-upload")) {

                                String origin = request.getHeader("Origin");
                                String referer = request.getHeader("Referer");
                                String targetOrigin = (origin != null && !origin.isBlank()) ? origin : extractOrigin(referer);

                                if (targetOrigin != null && !isOriginAllowed(targetOrigin)) {
                                    response.setStatus(jakarta.servlet.http.HttpServletResponse.SC_FORBIDDEN);
                                    response.setContentType("application/json;charset=UTF-8");
                                    response.getWriter().write("{\"error\": \"Forbidden\", \"message\": \"허용되지 않은 출처(Origin)로부터의 요청입니다.\"}");
                                    return;
                                }
                            }
                        }
                        filterChain.doFilter(request, response);
                    }
                }, org.springframework.security.web.csrf.CsrfFilter.class)
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
                        // [CORS & Static Resources PATCH] 정적 업로드 파일 및 OPTIONS 허용
                        .requestMatchers(org.springframework.http.HttpMethod.OPTIONS, "/**").permitAll()
                        .requestMatchers("/uploads/**", "/uploads/*").permitAll()
                        .requestMatchers("/error", "/favicon.ico", "/assets/**", "/index.html").permitAll()
                        // 버그 리포트 제출 (오프라인 큐/익명 충돌 리포트 POST만 permitAll 허용, 조회/수정/삭제는 인증 필요)
                        .requestMatchers(org.springframework.http.HttpMethod.POST, "/api/bug-reports", "/api/bug-reports/**").permitAll()
                        // 접근 로그 (페이지 이동 로그 POST만 permitAll 허용)
                        .requestMatchers(org.springframework.http.HttpMethod.POST, "/api/logs/access/**", "/api/logs/access/page-move").permitAll()
                        // 시스템 페이지 가이드 조회 (GET 요청은 비인가/인증 사용자 모두 화면 가이드 열람 허용, 수정/삭제는 권한 필요)
                        .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/guides", "/api/guides/**").permitAll()
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
                        .requestMatchers("/api/admin/master-data/**").authenticated()
                        
                        .requestMatchers("/api/admin/system/**").hasRole("ADMIN")
                        .requestMatchers("/api/admin/trash/**").hasRole("ADMIN")
                        // [전자결재 보안] 결재 기준정보/템플릿/알림규칙/부서 관리 API (인증된 내부 사용자 접근 허용, 제조사는 컨트롤러에서 차단)
                        .requestMatchers("/api/admin/approval-doc-types/**", "/api/admin/approval-templates/**", "/api/admin/notification-rules/**", "/api/admin/departments/**").authenticated()
                        .requestMatchers("/api/approvals/**").authenticated()
                        
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
        configuration.setAllowedHeaders(List.of("*"));
        configuration.setExposedHeaders(List.of("Set-Cookie", "Authorization", "XSRF-TOKEN", "X-XSRF-TOKEN", "X-Response-Time-Millis", "x-response-time-millis"));
        configuration.setAllowCredentials(true);
        configuration.setMaxAge(86400L);

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

    private String extractOrigin(String referer) {
        if (referer == null || referer.isBlank()) return null;
        try {
            java.net.URI uri = new java.net.URI(referer);
            return uri.getScheme() + "://" + uri.getAuthority();
        } catch (Exception e) {
            return null;
        }
    }

    private boolean isOriginAllowed(String origin) {
        if (origin == null || origin.isBlank()) return true;
        String lower = origin.toLowerCase();
        if (lower.contains("localhost") || lower.contains("127.0.0.1")) return true;
        if (lower.endsWith(".kro.kr") || lower.equals("https://qms-test.kro.kr")) return true;
        if (lower.endsWith(".pages.dev") || lower.endsWith(".hf.space")) return true;

        List<String> originsList = Arrays.stream(allowedOrigins.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .collect(Collectors.toList());
        for (String allowed : originsList) {
            if (allowed.equals("*") || allowed.equalsIgnoreCase(origin)) return true;
            if (allowed.startsWith("https://*.") && origin.startsWith("https://")) {
                String domain = allowed.substring("https://*.".length());
                if (origin.substring("https://".length()).endsWith(domain)) return true;
            }
        }
        return false;
    }
}
