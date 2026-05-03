package com.example.ims.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    // [Task 15] CORS는 SecurityConfig에서 일괄 관리하므로 여기서 제거
    @Override
    public void addCorsMappings(CorsRegistry registry) {
        // SecurityConfig.corsConfigurationSource()에서 처리함
    }

    /* 기존 CORS 설정 (주석 처리)
    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/**")
                .allowedOriginPatterns("http://localhost:*", "http://127.0.0.1:*", "https://*.onrender.com") 
                .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
                .allowedHeaders("*")
                .allowCredentials(true);
    }
    */

    @Override
    public void addResourceHandlers(
            org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry registry) {
        registry.addResourceHandler("/uploads/**")
                .addResourceLocations("file:uploads/");
        
        // 정적 리소스 핸들러에서 API 경로는 제외되도록 명시 (필요 시)
    }

    @Override
    public void addViewControllers(org.springframework.web.servlet.config.annotation.ViewControllerRegistry registry) {
        // 모든 비-API 경로를 index.html로 리다이렉트하여 프론트엔드 라우팅 지원
        registry.addViewController("/{path:[^\\.]*}")
                .setViewName("forward:/index.html");
    }
}
