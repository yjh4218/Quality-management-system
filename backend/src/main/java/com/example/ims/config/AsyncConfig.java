package com.example.ims.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

import java.util.concurrent.Executor;

/**
 * 이메일 비동기 발송 및 기타 백엔드 비동기 작업을 제어하는 스레드 풀 설정 클래스입니다.
 * new Thread().start() 방식의 무분별한 스레드 생성을 제한하고, 스레드를 풀(Pool)로 관리하여
 * 시스템 메모리 부족(OOM) 및 서버 다운을 안전하게 방지합니다.
 */
@Configuration
@EnableAsync
public class AsyncConfig {

    @Bean(name = "mailExecutor")
    public Executor mailExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        // 기본 활성 스레드 수
        executor.setCorePoolSize(5);
        // 최대 활성 스레드 수
        executor.setMaxPoolSize(10);
        // 큐 용량 (메일 발송 작업 대기열)
        executor.setQueueCapacity(100);
        // 스레드 이름 접두사
        executor.setThreadNamePrefix("QMS-Mail-Executor-");
        // 시스템 종료 시 대기 중인 작업 완료 대기 설정
        executor.setWaitForTasksToCompleteOnShutdown(true);
        // 대기 시간 최대 10초 설정
        executor.setAwaitTerminationSeconds(10);
        executor.initialize();
        return executor;
    }
}
