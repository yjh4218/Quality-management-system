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

@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class PreflightBypassFilter implements Filter {

    @Override
    public void doFilter(ServletRequest req, ServletResponse res, FilterChain chain)
            throws IOException, ServletException {
        HttpServletRequest request = (HttpServletRequest) req;
        HttpServletResponse response = (HttpServletResponse) res;

        // 최상위에서 CORS 기본 헤더 강제 부여 (일반 요청용)
        String origin = request.getHeader("Origin");
        if (origin != null) {
            response.setHeader("Access-Control-Allow-Origin", origin);
            response.setHeader("Access-Control-Allow-Credentials", "true");
            response.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, PATCH");
            response.setHeader("Access-Control-Allow-Max-Age", "3600");
            response.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type, X-Requested-With, Accept, Origin");
        }

        // OPTIONS 요청은 즉시 성공 처리하여 Security 필터 진입 전 반환
        if ("OPTIONS".equalsIgnoreCase(request.getMethod())) {
            response.setStatus(HttpServletResponse.SC_OK);
            return;
        }

        // text/plain 형식으로 날아온 JSON 데이터를 application/json으로 강제 변환하여 @RequestBody 지원
        String contentType = request.getContentType();
        if (contentType != null && contentType.toLowerCase().startsWith("text/plain")) {
            HttpServletRequestWrapper wrappedRequest = new HttpServletRequestWrapper(request) {
                @Override
                public String getContentType() {
                    return "application/json;charset=UTF-8";
                }

                @Override
                public String getHeader(String name) {
                    if ("Content-Type".equalsIgnoreCase(name)) {
                        return "application/json;charset=UTF-8";
                    }
                    return super.getHeader(name);
                }

                @Override
                public Enumeration<String> getHeaders(String name) {
                    if ("Content-Type".equalsIgnoreCase(name)) {
                        return Collections.enumeration(List.of("application/json;charset=UTF-8"));
                    }
                    return super.getHeaders(name);
                }
            };
            chain.doFilter(wrappedRequest, res);
        } else {
            chain.doFilter(req, res);
        }
    }
}
