package com.example.ims.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * 대용량 감사 로그 관리를 위한 자동 아카이빙 스케줄러입니다.
 * 시스템 부하가 적은 새벽 시간대에 정기적으로 실행됩니다.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class AuditLogArchiverScheduler {

    private final AuditLogService auditLogService;

    /**
     * 매일 새벽 3시에 6개월 이상 된 로그를 아카이빙합니다.
     * 크론 표현식: 초 분 시 일 월 요일
     */
    @Scheduled(cron = "0 0 3 * * *")
    public void runArchivingTask() {
        log.info("[SCHEDULE] Starting scheduled audit log archiving task...");
        try {
            auditLogService.archiveOldLogs();
            log.info("[SCHEDULE] Scheduled audit log archiving task completed successfully.");
        } catch (Exception e) {
            log.error("[SCHEDULE] Scheduled audit log archiving task failed: {}", e.getMessage());
        }
    }
}
