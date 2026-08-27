package com.example.ims.config;

import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.filter.ShallowEtagHeaderFilter;

/**
 * [HTTP ETag 기반 무비용 캐싱 설정]
 * - 변경되지 않은 API 응답에 대해 304 Not Modified를 반환하여 대역폭 및 클라이언트 파싱 비용 0바이트 처리
 * - 특히 마스터 데이터(BOM, 제조사, 규제 성분 등) 반복 조회 시 네트워크 전송 시간 획기적 단축
 */
@Configuration
public class EtagConfig {

    @Bean
    public FilterRegistrationBean<ShallowEtagHeaderFilter> shallowEtagHeaderFilter() {
        FilterRegistrationBean<ShallowEtagHeaderFilter> filterRegistrationBean = new FilterRegistrationBean<>(new ShallowEtagHeaderFilter());
        filterRegistrationBean.addUrlPatterns("/api/master/*", "/api/regulatory-ingredients/*", "/api/packaging-templates/*");
        filterRegistrationBean.setName("etagFilter");
        filterRegistrationBean.setOrder(20);
        return filterRegistrationBean;
    }
}
