package com.example.ims.config;

import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.Refill;
import jakarta.servlet.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * 전역 Rate Limiting Filter.
 * 로그인, 파일 업로드, 이메일 발송 등 민감 엔드포인트에 대한 브루트포스 및 자원 고갈 공격을 방어합니다.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
@Slf4j
public class RateLimitFilter implements Filter {

    // IP + Endpoint 유형별로 버킷을 캐싱
    private final Map<String, Bucket> buckets = new ConcurrentHashMap<>();

    @Override
    public void init(FilterConfig filterConfig) throws ServletException {
        // Initialization if needed
    }

    @Override
    public void doFilter(ServletRequest servletRequest, ServletResponse servletResponse, FilterChain filterChain)
            throws IOException, ServletException {

        HttpServletRequest httpRequest = (HttpServletRequest) servletRequest;
        HttpServletResponse httpResponse = (HttpServletResponse) servletResponse;

        String path = httpRequest.getRequestURI();
        String method = httpRequest.getMethod();
        String clientIp = getClientIp(httpRequest);

        BucketLimitConfig limitConfig = getLimitConfig(path, method);

        if (limitConfig != null) {
            String cacheKey = clientIp + ":" + limitConfig.getCategory() + ":" + path;
            Bucket bucket = buckets.computeIfAbsent(cacheKey, key -> createNewBucket(limitConfig));

            if (!bucket.tryConsume(1)) {
                log.warn("[RATE LIMIT EXCEEDED] Client IP: {}, Path: {}, Category: {}", clientIp, path, limitConfig.getCategory());
                
                httpResponse.setStatus(429); // Too Many Requests
                httpResponse.setContentType("application/json;charset=UTF-8");
                httpResponse.getWriter().write(String.format(
                        "{\"error\": \"Too Many Requests\", \"message\": \"%s\", \"limit\": %d, \"period\": \"1 minute\"}",
                        limitConfig.getErrorMessage(),
                        limitConfig.getLimit()
                ));
                return;
            }
        }

        filterChain.doFilter(servletRequest, servletResponse);
    }

    @Override
    public void destroy() {
        // Destroy if needed
    }

    private Bucket createNewBucket(BucketLimitConfig config) {
        return Bucket.builder()
                .addLimit(Bandwidth.classic(config.getLimit(), Refill.intervally(config.getLimit(), Duration.ofMinutes(1))))
                .build();
    }

    private BucketLimitConfig getLimitConfig(String path, String method) {
        // 1. 로그인 엔드포인트: 분당 5회 제한
        if (path.equals("/api/auth/login") && "POST".equalsIgnoreCase(method)) {
            return new BucketLimitConfig("LOGIN", 5, "로그인 시도 한도를 초과했습니다. 잠시 후(1분 뒤) 다시 시도해 주십시오.");
        }

        // 2. 파일 업로드 엔드포인트: 분당 10회 제한
        if ((path.contains("/upload") || path.contains("/file") || path.contains("/image")) 
            && ("POST".equalsIgnoreCase(method) || "PUT".equalsIgnoreCase(method))) {
            return new BucketLimitConfig("UPLOAD", 10, "파일 업로드 요청 빈도가 너무 높습니다. 1분 뒤에 다시 업로드해 주십시오.");
        }

        // 3. 이메일 발송 엔드포인트: 분당 10회 제한 (Claim 메일 발송 등 포함)
        if (path.contains("/send-email") || path.contains("/re-request") || path.contains("/mail")) {
            return new BucketLimitConfig("EMAIL", 10, "메일 발송 요청 한도를 초과했습니다. 1분 뒤에 다시 시도해 주십시오.");
        }

        return null; // 제한 대상이 아님
    }

    private String getClientIp(HttpServletRequest request) {
        String ip = request.getHeader("X-Forwarded-For");
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getHeader("Proxy-Client-IP");
        }
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getHeader("WL-Proxy-Client-IP");
        }
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getRemoteAddr();
        }
        return ip;
    }

    @lombok.Data
    @lombok.AllArgsConstructor
    private static class BucketLimitConfig {
        private String category;
        private int limit;
        private String errorMessage;
    }
}
