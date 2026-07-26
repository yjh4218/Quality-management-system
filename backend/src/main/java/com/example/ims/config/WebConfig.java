package com.example.ims.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    @org.springframework.beans.factory.annotation.Value("${cors.allowed-origins:}")
    private String allowedOrigins;



    @Override
    public void addResourceHandlers(
            org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry registry) {
        registry.addResourceHandler("/uploads/**")
                .addResourceLocations("file:uploads/");
        
        // 정적 리소스 핸들러에서 API 경로는 제외되도록 명시 (필요 시)
    }

    @Override
    public void addInterceptors(org.springframework.web.servlet.config.annotation.InterceptorRegistry registry) {
        registry.addInterceptor(new org.springframework.web.servlet.HandlerInterceptor() {
            @Override
            public boolean preHandle(jakarta.servlet.http.HttpServletRequest request, jakarta.servlet.http.HttpServletResponse response, Object handler) {
                String uri = request.getRequestURI().toLowerCase();
                if (uri.startsWith("/uploads/")) {
                    response.setHeader("X-Content-Type-Options", "nosniff");
                    response.setHeader("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'");

                    boolean isInlineMedia = uri.endsWith(".jpg") || uri.endsWith(".jpeg") || uri.endsWith(".png")
                            || uri.endsWith(".gif") || uri.endsWith(".webp") || uri.endsWith(".pdf");

                    if (!isInlineMedia) {
                        int lastSlash = uri.lastIndexOf('/');
                        String fileName = (lastSlash >= 0) ? uri.substring(lastSlash + 1) : "file";
                        response.setHeader("Content-Disposition", "attachment; filename=\"" + fileName + "\"");
                    }
                }
                return true;
            }
        }).addPathPatterns("/uploads/**");
    }

    @Override
    public void addViewControllers(org.springframework.web.servlet.config.annotation.ViewControllerRegistry registry) {
        // 모든 비-API 경로를 index.html로 리다이렉트하여 프론트엔드 라우팅 지원
        registry.addViewController("/{path:[^\\.]*}")
                .setViewName("forward:/index.html");
    }
}
