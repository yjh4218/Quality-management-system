package com.example.ims.config;

import jakarta.servlet.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletRequestWrapper;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.util.Collections;
import java.util.Enumeration;
import java.util.List;
import java.util.Set;

@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class PreflightBypassFilter implements Filter {

    // [보안 강화] 퍼블릭 플랫폼 와일드카드 전면 배제 및 공식 운영/개발 도메인만 엄격하게 지정
    private static final Set<String> ALLOWED_ORIGINS = Set.of(
        "https://qms-test.kro.kr",
        "https://qualitymange.pages.dev",
        "https://yjh332123-qms.hf.space",
        "http://localhost:5173",
        "http://127.0.0.1:5173"
    );

    @Override
    public void doFilter(ServletRequest req, ServletResponse res, FilterChain chain)
            throws IOException, ServletException {
        HttpServletRequest request = (HttpServletRequest) req;
        HttpServletResponse response = (HttpServletResponse) res;

        // Origin 헤더 대소문자 무관 추출
        String origin = request.getHeader("Origin");
        if (origin == null || origin.trim().isEmpty()) {
            origin = request.getHeader("origin");
        }

        boolean isAllowed = origin != null && ALLOWED_ORIGINS.contains(origin.trim());

        // [1] 허가된 공식 도메인에 대해서만 정확한 CORS 헤더 주입
        if (isAllowed) {
            response.setHeader("Access-Control-Allow-Origin", origin.trim());
            response.setHeader("Access-Control-Allow-Credentials", "true");
            response.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, PATCH");
            response.setHeader("Access-Control-Allow-Max-Age", "3600");
            response.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type, X-Requested-With, X-XSRF-TOKEN, Accept, Origin, Access-Control-Request-Method, Access-Control-Request-Headers");
            response.setHeader("Access-Control-Expose-Headers", "Set-Cookie, Authorization, XSRF-TOKEN, X-XSRF-TOKEN, X-Response-Time-Millis, ETag");
        }

        // [2] OPTIONS Preflight 요청은 _method 파싱 전 즉시 200 OK 반환 (Security 인증 필터 간섭 차단)
        if ("OPTIONS".equalsIgnoreCase(request.getMethod())) {
            response.setStatus(HttpServletResponse.SC_OK);
            return;
        }

        // [3] Non-OPTIONS 실제 데이터 요청에 대해서만 _method 파라미터 오버라이드 적용
        String methodParam = request.getParameter("_method");
        final String overrideMethod = (methodParam != null && !methodParam.trim().isEmpty()) 
                ? methodParam.toUpperCase().trim() 
                : null;

        HttpServletRequest wrappedRequest = request;

        if (overrideMethod != null || (request.getContentType() != null && request.getContentType().toLowerCase().startsWith("text/plain"))) {
            wrappedRequest = new HttpServletRequestWrapper(request) {
                @Override
                public String getMethod() {
                    if (overrideMethod != null) {
                        return overrideMethod;
                    }
                    return super.getMethod();
                }

                @Override
                public String getContentType() {
                    String contentType = super.getContentType();
                    if (contentType != null && contentType.toLowerCase().startsWith("text/plain")) {
                        return "application/json;charset=UTF-8";
                    }
                    return contentType;
                }

                @Override
                public String getHeader(String name) {
                    if ("Content-Type".equalsIgnoreCase(name)) {
                        String contentType = super.getContentType();
                        if (contentType != null && contentType.toLowerCase().startsWith("text/plain")) {
                            return "application/json;charset=UTF-8";
                        }
                    }
                    return super.getHeader(name);
                }

                @Override
                public Enumeration<String> getHeaders(String name) {
                    if ("Content-Type".equalsIgnoreCase(name)) {
                        String contentType = super.getContentType();
                        if (contentType != null && contentType.toLowerCase().startsWith("text/plain")) {
                            return Collections.enumeration(List.of("application/json;charset=UTF-8"));
                        }
                    }
                    return super.getHeaders(name);
                }
            };
        }

        chain.doFilter(wrappedRequest, res);
    }
}
