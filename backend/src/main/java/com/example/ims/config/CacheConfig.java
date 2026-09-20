package com.example.ims.config;

import com.github.benmanes.caffeine.cache.Caffeine;
import org.springframework.cache.CacheManager;
import org.springframework.cache.caffeine.CaffeineCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.Arrays;
import java.util.concurrent.TimeUnit;

/**
 * [성능 최적화] 기준정보 및 대시보드 인메모리 Caffeine 캐시 설정
 * 무거운 DB 반복 조회를 제거하고 응답 속도를 수십 ms 이내로 단축합니다.
 */
@Configuration
public class CacheConfig {

    @Bean
    public CacheManager cacheManager() {
        CaffeineCacheManager cacheManager = new CaffeineCacheManager();
        // 동적 캐시 생성을 허용하여 정의된 모든 @Cacheable 어노테이션이 안전하게 동작하도록 지원
        cacheManager.setCaffeine(Caffeine.newBuilder()
                .initialCapacity(50)
                .maximumSize(1000)
                .expireAfterWrite(10, TimeUnit.MINUTES)
                .recordStats());
        return cacheManager;
    }
}
