package com.example.ims.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.session.web.http.CookieSerializer;
import org.springframework.session.web.http.DefaultCookieSerializer;

/**
 * [보안 패치] 세션 쿠키 정책 설정 클래스
 * 브라우저 종료 시 자동으로 로그아웃되도록(자동 로그인 방지) 쿠키 설정을 관리합니다.
 */
@Configuration
public class SessionConfig {

    @org.springframework.beans.factory.annotation.Value("${server.servlet.session.cookie.secure:false}")
    private boolean useSecureCookie;

    @org.springframework.beans.factory.annotation.Value("${server.servlet.session.cookie.same-site:lax}")
    private String sameSite;

    @Bean
    public CookieSerializer cookieSerializer() {
        DefaultCookieSerializer serializer = new DefaultCookieSerializer();
        
        // 1. 쿠키 이름 설정 (application.properties와 통일)
        serializer.setCookieName("QMS_SESSION_V2");
        
        // 2. 쿠키 경로 설정
        serializer.setCookiePath("/");
        
        // 3. 보안 설정: 자바스크립트에서 쿠키 접근 방지
        serializer.setUseHttpOnlyCookie(true);
        
        // 4. [핵심] 쿠키 유효기간 설정
        // -1로 설정하면 브라우저 종료 시 쿠키가 삭제되어 자동 로그인을 방지합니다.
        serializer.setCookieMaxAge(-1);

        // 5. [인코딩 패치] 쿠키 값을 Base64로 인코딩하는 기능은 레이턴시 및 호환성을 위해 끕니다. (V2 이름 변경으로 충분)
        serializer.setUseBase64Encoding(false);

        // 6. [동적 설정] 로컬(HTTP)은 lax/false, 운영(HTTPS)은 none/true 자동 적용
        serializer.setSameSite(sameSite != null ? sameSite : "lax");
        serializer.setUseSecureCookie(useSecureCookie);
        
        return serializer;
    }
}
