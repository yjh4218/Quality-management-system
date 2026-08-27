package com.example.ims.config;

import jakarta.servlet.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.util.regex.Pattern;

/**
 * [E2E 레이턴시 분해 측정 & 실시간 성능 모니터링 서블릿 필터]
 * - 모든 API 요청의 서버 처리 시간을 System.nanoTime() 정밀도로 측정
 * - 프론트엔드 Axios에서 RTT(서버+네트워크)를 분해할 수 있도록 X-Response-Time-Millis 헤더 주입
 * - 500ms 이상 지연 요청은 WARN [PERF-SLOW]로 자동 기록
 * - URL 쿼리 파라미터 내 개인정보 및 민감 토큰 자동 마스킹 (PII Sanitization)
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 1)
public class PerformanceLoggingFilter implements Filter {

    private static final Logger log = LoggerFactory.getLogger(PerformanceLoggingFilter.class);
    private static final long SLOW_THRESHOLD_MS = 500L;

    // 민감 정보 파라미터 마스킹 정규식 (token, password, secret, key, credential, auth 등)
    private static final Pattern SENSITIVE_PARAM_PATTERN = Pattern.compile(
        "(?i)(token|password|passwd|secret|key|credential|authorization|auth|accessToken|refreshToken)=([^&]+)"
    );

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {

        if (!(request instanceof HttpServletRequest httpRequest) || !(response instanceof HttpServletResponse httpResponse)) {
            chain.doFilter(request, response);
            return;
        }

        String uri = httpRequest.getRequestURI();
        // 정적 리소스나 헬스체크 등은 측정 제외 (API 및 데이터 요청 집중)
        boolean isApiRequest = uri.startsWith("/api") || uri.startsWith("/login") || uri.startsWith("/logout");

        if (!isApiRequest) {
            chain.doFilter(request, response);
            return;
        }

        long startNano = System.nanoTime();

        try {
            chain.doFilter(request, response);
        } finally {
            long durationNs = System.nanoTime() - startNano;
            long durationMs = durationNs / 1_000_000L;

            // 1. 프론트엔드 RTT 분해 측정을 위한 응답 헤더 주입 (커밋되지 않은 경우)
            if (!httpResponse.isCommitted()) {
                httpResponse.setHeader("X-Response-Time-Millis", String.valueOf(durationMs));
            }

            // 2. 민감정보 마스킹된 URI 쿼리스트링 생성
            String method = httpRequest.getMethod();
            String fullPath = getMaskedRequestPath(httpRequest);
            String username = getAuthenticatedUsername();

            // 3. 레이턴시 기준 조건부 로깅 (500ms 이상 WARN, 미만 DEBUG)
            if (durationMs >= SLOW_THRESHOLD_MS) {
                log.warn("⏳ [PERF-SLOW] {} {} took {}ms (status: {}) | User: {}",
                        method, fullPath, durationMs, httpResponse.getStatus(), username);
            } else if (log.isDebugEnabled()) {
                log.debug("⚡ [PERF] {} {} took {}ms (status: {}) | User: {}",
                        method, fullPath, durationMs, httpResponse.getStatus(), username);
            }
        }
    }

    private String getMaskedRequestPath(HttpServletRequest request) {
        String uri = request.getRequestURI();
        String queryString = request.getQueryString();
        if (queryString == null || queryString.isBlank()) {
            return uri;
        }
        String maskedQuery = SENSITIVE_PARAM_PATTERN.matcher(queryString).replaceAll("$1=***MASKED***");
        return uri + "?" + maskedQuery;
    }

    private String getAuthenticatedUsername() {
        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.isAuthenticated() && !"anonymousUser".equals(auth.getName())) {
                return auth.getName();
            }
        } catch (Exception ignored) {
        }
        return "anonymous";
    }
}
