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
public class BugReportService {

    private final BugReportRepository bugReportRepository;
    private final AuditLogService auditLogService;

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

        report.setStatus("OPEN");
        report.setCreatedAt(LocalDateTime.now());
        report.setUpdatedAt(null);
        if (report.getOccurrenceCount() == null || report.getOccurrenceCount() < 1) {
            report.setOccurrenceCount(1);
        }

        // 2. [무한루프 DB 폭주 방지] 최근 1분 내 동일 화면(screenName) + 동일 description 중복 제출 여부 확인
        LocalDateTime oneMinuteAgo = LocalDateTime.now().minusMinutes(1);
        String screen = report.getScreenName() != null ? report.getScreenName() : "";
        String desc = report.getDescription() != null ? report.getDescription() : "";

        var existing = bugReportRepository.findFirstByScreenNameAndDescriptionAndCreatedAtAfterOrderByCreatedAtDesc(
            screen, desc, oneMinuteAgo
        );

        if (existing.isPresent()) {
            BugReport dup = existing.get();
            dup.setOccurrenceCount((dup.getOccurrenceCount() != null ? dup.getOccurrenceCount() : 1) + 1);
            dup.setUpdatedAt(LocalDateTime.now());
            return bugReportRepository.save(dup);
        }

        BugReport saved = bugReportRepository.save(report);

        try {
            auditLogService.logAction(
                    saved.getReporterUsername() != null ? saved.getReporterUsername() : "SYSTEM",
                    "BUG_REPORT_SUBMIT",
                    "버그 리포트 등록",
                    String.format("버그 리포트 신규 적재 [ID: %d, 발생위치: %s, 내용: %s]", saved.getId(), saved.getScreenName(), saved.getDescription())
            );
        } catch (Exception e) {
            // ignore
        }

        return saved;
    }

    @Transactional(readOnly = true)
    public List<BugReport> getAllReports() {
        return bugReportRepository.findAllByOrderByCreatedAtDesc();
    }

    @Transactional
    public BugReport updateStatus(Long id, String status) {
        BugReport report = bugReportRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Bug report not found"));
        report.setStatus(status);
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
            // ignore
        }

        return updated;
    }
}
