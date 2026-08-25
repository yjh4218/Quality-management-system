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

        // OPTIONS 요청은 CORS 헤더 적용 후 즉시 성공(200 OK) 반환하여 Security 필터 진입 전 처리
        if ("OPTIONS".equalsIgnoreCase(request.getMethod())) {
            String origin = request.getHeader("Origin");
            if (origin == null || origin.trim().isEmpty()) {
                origin = request.getHeader("origin");
            }
            if (origin != null && !origin.trim().isEmpty()) {
                response.setHeader("Access-Control-Allow-Origin", origin);
                response.setHeader("Access-Control-Allow-Credentials", "true");
                response.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, PATCH");
                response.setHeader("Access-Control-Allow-Max-Age", "3600");
                response.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type, X-Requested-With, X-XSRF-TOKEN, Accept, Origin");
            }
            response.setStatus(HttpServletResponse.SC_OK);
            return;
        }

        // [METHOD OVERRIDE] 쿼리 스트링의 _method 파라미터가 존재하면 HTTP method를 변경된 값으로 강제 재정의
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
