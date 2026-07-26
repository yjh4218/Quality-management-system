package com.example.ims.config;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
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
import java.util.concurrent.TimeUnit;

/**
 * 전역 Rate Limiting Filter.
 * 로그인, 파일 업로드, 이메일 발송, 제조사 서류 제출/조회 등 민감 엔드포인트에 대한 브루트포스 및 자원 고갈 공격을 방어합니다.
 * [보안 개선]
 * 1. Caffeine Cache 도입으로 메모리 누수(OOM) 방지 (10분 미사용 시 만료, Max 10,000)
 * 2. 캐시 키에서 경로 변수(토큰 등) 제거 -> IP + Category 기반 키로 통일 (토큰 무차별 우회 방지)
 * 3. GET /api/vendor-upload/{token}/info 포함 제조사 업로드 요청 전역 카테고리화
 * 4. X-Forwarded-For 헤더 파싱 및 remoteAddr 안전성 강화
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
@Slf4j
public class RateLimitFilter implements Filter {

    // IP + Category 기준 Caffeine Cache 버킷
    private final Cache<String, Bucket> buckets = Caffeine.newBuilder()
            .expireAfterAccess(10, TimeUnit.MINUTES)
            .maximumSize(10000)
            .build();

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
            // [보안 PATCH] 경로 변수(토큰)를 키에서 제외하고 IP + Category 만으로 버킷 생성
            String cacheKey = clientIp + ":" + limitConfig.getCategory();
            Bucket bucket = buckets.get(cacheKey, key -> createNewBucket(limitConfig));

            if (bucket != null && !bucket.tryConsume(1)) {
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
        // 1. 제조사 서류 제출 및 토큰 정보 조회 (GET /info, POST /file 등): 분당 10회 제한 (토큰 무차별 대입 방지)
        if (path.startsWith("/api/vendor-upload/")) {
            return new BucketLimitConfig("VENDOR_UPLOAD", 10, "제조사 서류 제출/조회 요청 한도를 초과했습니다. 1분 뒤 다시 시도해 주십시오.");
        }

        // 2. 로그인 엔드포인트: 분당 5회 제한
        if (path.equals("/api/auth/login") && "POST".equalsIgnoreCase(method)) {
            return new BucketLimitConfig("LOGIN", 5, "로그인 시도 한도를 초과했습니다. 잠시 후(1분 뒤) 다시 시도해 주십시오.");
        }

        // 3. 일반 파일 업로드 엔드포인트: 분당 10회 제한
        if ((path.contains("/upload") || path.contains("/file") || path.contains("/image"))
                && ("POST".equalsIgnoreCase(method) || "PUT".equalsIgnoreCase(method))) {
            return new BucketLimitConfig("UPLOAD", 10, "파일 업로드 요청 빈도가 너무 높습니다. 1분 뒤에 다시 업로드해 주십시오.");
        }

        // 4. 이메일 발송 엔드포인트: 분당 10회 제한 (Claim 메일 발송 등 포함)
        if (path.contains("/send-email") || path.contains("/re-request") || path.contains("/mail")) {
            return new BucketLimitConfig("EMAIL", 10, "메일 발송 요청 한도를 초과했습니다. 1분 뒤에 다시 시도해 주십시오.");
        }

        // 5. 버그 리포트 전송 엔드포인트: 분당 10회 제한
        if (path.equals("/api/bug-reports") && "POST".equalsIgnoreCase(method)) {
            return new BucketLimitConfig("BUG_REPORT", 10, "버그 리포트 제출 한도를 초과했습니다. 1분 뒤 시도해 주십시오.");
        }

        return null; // 제한 대상이 아님
    }

    private String getClientIp(HttpServletRequest request) {
        String xff = request.getHeader("X-Forwarded-For");
        if (xff != null && !xff.isBlank() && !"unknown".equalsIgnoreCase(xff)) {
            String[] ips = xff.split(",");
            for (String rawIp : ips) {
                String clientIp = rawIp.trim();
                if (!clientIp.isEmpty() && !"unknown".equalsIgnoreCase(clientIp)) {
                    return clientIp;
                }
            }
        }
        String remoteAddr = request.getRemoteAddr();
        return (remoteAddr != null && !remoteAddr.isBlank()) ? remoteAddr : "0.0.0.0";
    }

    @lombok.Data
    @lombok.AllArgsConstructor
    private static class BucketLimitConfig {
        private String category;
        private int limit;
        private String errorMessage;
    }
}
