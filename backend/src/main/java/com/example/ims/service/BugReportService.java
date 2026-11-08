package com.example.ims.service;

import com.example.ims.entity.BugReport;
import com.example.ims.repository.BugReportRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@lombok.extern.slf4j.Slf4j
public class BugReportService {

    private final BugReportRepository bugReportRepository;
    private final AuditLogService auditLogService;
    private final org.springframework.beans.factory.ObjectProvider<NotificationService> notificationServiceProvider;

    @Transactional
    public BugReport submitReport(BugReport report) {
        if (report == null) {
            throw new IllegalArgumentException("버그 리포트 정보가 올바르지 않습니다.");
        }

        // 1. [보안 & 데이터 변조 방지] null safe 기본값 강제 설정 (500 에러 원천 차단)
        report.setId(null);
        if (report.getReporterUsername() == null || report.getReporterUsername().trim().isEmpty() || "anonymousUser".equalsIgnoreCase(report.getReporterUsername())) {
            report.setReporterUsername("ANONYMOUS_USER");
        }
        if (report.getScreenName() == null || report.getScreenName().trim().isEmpty()) {
            report.setScreenName("UNKNOWN_SCREEN");
        }
        if (report.getDescription() == null || report.getDescription().trim().isEmpty()) {
            report.setDescription("시스템 수집 오류 리포트");
        }
        if (report.getDescription().length() > 3000) {
            report.setDescription(report.getDescription().substring(0, 3000));
        }
        if (report.getUrl() != null && report.getUrl().length() > 950) {
            report.setUrl(report.getUrl().substring(0, 950));
        }
        if (report.getErrorCategory() == null || report.getErrorCategory().trim().isEmpty()) {
            report.setErrorCategory("UNKNOWN");
        }

        report.setStatus("OPEN");
        report.setCreatedAt(LocalDateTime.now());
        report.setUpdatedAt(null);
        if (report.getOccurrenceCount() == null || report.getOccurrenceCount() < 1) {
            report.setOccurrenceCount(1);
        }

        // 2. [정밀 중복 방지] 최근 1분 내 동일 화면 + 동일 카테고리 + 유사 에러 내용 매칭 (서로 다른 에러 병합 방지)
        LocalDateTime oneMinuteAgo = LocalDateTime.now().minusMinutes(1);
        String screen = report.getScreenName() != null ? report.getScreenName().trim() : "";
        String category = report.getErrorCategory() != null ? report.getErrorCategory().trim() : "UNKNOWN";

        String rawDesc = report.getDescription() != null ? report.getDescription() : "";
        String normalizedDesc = rawDesc.replaceAll("\\[CID:[^\\]]+\\]", "").trim();
        String descPrefix = normalizedDesc.length() > 60 ? normalizedDesc.substring(0, 60) : normalizedDesc;

        List<BugReport> recentList = bugReportRepository.findByScreenNameAndErrorCategoryAndCreatedAtAfter(
            screen, category, oneMinuteAgo
        );

        BugReport dup = null;
        for (BugReport candidate : recentList) {
            String candidateDesc = candidate.getDescription() != null 
                    ? candidate.getDescription().replaceAll("\\[CID:[^\\]]+\\]", "").trim() : "";
            if (candidateDesc.startsWith(descPrefix) || descPrefix.startsWith(candidateDesc.length() > 60 ? candidateDesc.substring(0, 60) : candidateDesc)) {
                dup = candidate;
                break;
            }
        }

        if (dup != null) {
            dup.setOccurrenceCount((dup.getOccurrenceCount() != null ? dup.getOccurrenceCount() : 1) + 1);
            dup.setUpdatedAt(LocalDateTime.now());
            if (report.getErrorCategory() != null && !"UNKNOWN".equals(report.getErrorCategory())) {
                dup.setErrorCategory(report.getErrorCategory());
            }
            BugReport savedDup = bugReportRepository.save(dup);

            // 누적 5, 10, 20회 등 주요 임계치 도달 시 관리자 알림 갱신
            if (savedDup.getOccurrenceCount() % 5 == 0) {
                notifyAdminsAsync(savedDup);
            }
            return savedDup;
        }

        BugReport saved = bugReportRepository.save(report);

        try {
            auditLogService.logAction(
                    saved.getReporterUsername() != null ? saved.getReporterUsername() : "SYSTEM",
                    "BUG_REPORT_SUBMIT",
                    "버그 리포트 등록",
                    String.format("버그 리포트 신규 적재 [ID: %d, 발생위치: %s, 카테고리: %s, 내용: %s]", saved.getId(), saved.getScreenName(), saved.getErrorCategory(), saved.getDescription())
            );
        } catch (Exception e) {
            log.warn("감사 로그 적재 실패 (버그 리포트 제출): {}", e.getMessage());
        }

        // [실시간 알림 연동] 관리자(ROLE_ADMIN)에게 인앱 알림 종 및 SSE 브로드캐스트 즉시 발송
        notifyAdminsAsync(saved);

        return saved;
    }

    private void notifyAdminsAsync(BugReport report) {
        if (report == null) return;
        try {
            NotificationService notificationService = notificationServiceProvider.getIfAvailable();
            if (notificationService != null) {
                String sev = report.getSeverity() != null ? report.getSeverity() : "CRITICAL";
                String title = "🚨 [버그 리포트] " + report.getScreenName() + " 오류 감지";
                String content = String.format("[%s] %s%s",
                        sev,
                        report.getDescription(),
                        (report.getOccurrenceCount() != null && report.getOccurrenceCount() > 1) 
                                ? " (누적 " + report.getOccurrenceCount() + "회)" : "");
                if (content.length() > 250) {
                    content = content.substring(0, 247) + "...";
                }
                notificationService.createNotification(
                        title,
                        content,
                        "BUG_ALERT",
                        null,
                        "ROLE_ADMIN",
                        null,
                        "/bug-reports"
                );
                notificationService.broadcastDataUpdate("bugReports");
            }
        } catch (Exception notifEx) {
            log.warn("알림 발송 실패 (버그 리포트 연동): {}", notifEx.getMessage());
        }
    }

    @Transactional(readOnly = true)
    public List<BugReport> getAllReports() {
        return bugReportRepository.findAllCustomOrdered();
    }

    @Transactional
    public BugReport updateStatus(Long id, String status) {
        BugReport report = bugReportRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Bug report not found"));
        report.setStatus(status);
        report.setRead(true);
        report.setReadAt(LocalDateTime.now());
        report.setUpdatedAt(LocalDateTime.now());
        BugReport updated = bugReportRepository.save(report);

        try {
            auditLogService.logAction(
                    "ADMIN",
                    "BUG_REPORT_STATUS_CHANGE",
                    "버그 리포트 상태 변경",
                    String.format("버그 리포트 [ID: %d] 상태 변경 -> %s", id, status)
            );
        } catch (Exception e) {
            log.warn("감사 로그 적재 실패 (버그 리포트 상태 변경): {}", e.getMessage());
        }

        return updated;
    }

    @Transactional
    public void markAsReadBatch(List<Long> ids, String username) {
        if (ids == null || ids.isEmpty()) return;
        List<BugReport> list = bugReportRepository.findAllById(ids);
        LocalDateTime now = LocalDateTime.now();
        List<BugReport> toSave = new java.util.ArrayList<>();
        for (BugReport r : list) {
            if (!r.isRead()) {
                r.setRead(true);
                r.setReadAt(now);
                toSave.add(r);
            }
        }
        if (!toSave.isEmpty()) {
            bugReportRepository.saveAll(toSave);
            log.info("[BUG_REPORT] Batch marked {} reports as read by {}", toSave.size(), username);
        }
    }

    @Transactional
    public void updateStatusBatch(List<Long> ids, String status, String username) {
        if (ids == null || ids.isEmpty() || status == null) return;
        List<BugReport> list = bugReportRepository.findAllById(ids);
        LocalDateTime now = LocalDateTime.now();
        for (BugReport r : list) {
            r.setStatus(status);
            r.setRead(true);
            r.setReadAt(now);
            r.setUpdatedAt(now);
        }
        bugReportRepository.saveAll(list);
        log.info("[BUG_REPORT] Batch updated status of {} reports to {} by {}", list.size(), status, username);
    }

    @Transactional
    public void markAllAsRead(String username) {
        List<BugReport> unreadList = bugReportRepository.findByIsReadFalse();
        if (!unreadList.isEmpty()) {
            LocalDateTime now = LocalDateTime.now();
            for (BugReport r : unreadList) {
                r.setRead(true);
                r.setReadAt(now);
            }
            bugReportRepository.saveAll(unreadList);
            log.info("[BUG_REPORT] Marked all {} unread reports as read by {}", unreadList.size(), username);
        }
    }

    @Transactional(readOnly = true)
    public long getOpenReportCount() {
        return bugReportRepository.countUnread();
    }
}
