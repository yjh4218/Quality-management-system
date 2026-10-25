package com.example.ims.controller;

import com.example.ims.entity.BugReport;
import com.example.ims.service.BugReportService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import com.example.ims.repository.UserRepository;
import java.util.List;

@RestController
@RequestMapping("/api/bug-reports")
@RequiredArgsConstructor
public class BugReportController {

    private final BugReportService bugReportService;
    private final UserRepository userRepository;

    @PostMapping
    @PreAuthorize("permitAll()")
    public ResponseEntity<BugReport> submitReport(@jakarta.validation.Valid @RequestBody(required = false) com.example.ims.dto.BugReportSubmitRequest request, Authentication authentication) {
        com.example.ims.dto.BugReportSubmitRequest dto = (request != null) ? request : new com.example.ims.dto.BugReportSubmitRequest();
        BugReport targetReport = BugReport.builder()
                .reporterUsername(dto.getReporterUsername())
                .reporterName(dto.getReporterName())
                .screenName(dto.getScreenName())
                .url(dto.getUrl())
                .steps(dto.getSteps())
                .description(dto.getDescription())
                .serverError(dto.getServerError())
                .severity(dto.getSeverity())
                .errorCategory(dto.getErrorCategory() != null ? dto.getErrorCategory() : "UNKNOWN")
                .build();

        if (authentication != null && authentication.isAuthenticated()) {
            String username = authentication.getName();
            if (username != null && !username.trim().isEmpty() && !"anonymousUser".equalsIgnoreCase(username)) {
                if (targetReport.getReporterUsername() == null || targetReport.getReporterUsername().trim().isEmpty() || "unknown".equalsIgnoreCase(targetReport.getReporterUsername())) {
                    targetReport.setReporterUsername(username);
                }
                if (targetReport.getReporterName() == null || targetReport.getReporterName().trim().isEmpty() || "ANONYMOUS_USER".equalsIgnoreCase(targetReport.getReporterName())) {
                    userRepository.findByUsername(username).ifPresent(u -> {
                        String company = u.getManufacturer() != null ? u.getManufacturer().getName() : "HQ(본사)";
                        String dept = u.getDepartment() != null ? u.getDepartment() : "품질관리팀";
                        targetReport.setReporterName(company + " / " + dept + " / " + u.getName());
                    });
                }
            }
        }
        return ResponseEntity.ok(bugReportService.submitReport(targetReport));
    }

    @GetMapping
    @PreAuthorize("@perm.can('bugReports', 'VIEW')")
    public ResponseEntity<List<BugReport>> getAllReports() {
        return ResponseEntity.ok(bugReportService.getAllReports());
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("@perm.can('bugReports', 'EDIT')")
    public ResponseEntity<BugReport> updateStatus(@PathVariable Long id, @jakarta.validation.Valid @RequestBody com.example.ims.dto.BugReportStatusUpdateDto payload) {
        String status = payload.status();
        return ResponseEntity.ok(bugReportService.updateStatus(id, status));
    }

    @PostMapping("/read-batch")
    @PreAuthorize("@perm.can('bugReports', 'VIEW') or @perm.can('bugReports', 'EDIT')")
    public ResponseEntity<java.util.Map<String, Object>> markAsReadBatch(
            @RequestBody java.util.Map<String, java.util.List<Long>> payload,
            Authentication authentication) {
        java.util.List<Long> ids = payload != null ? payload.get("ids") : null;
        String username = authentication != null ? authentication.getName() : "ADMIN";
        bugReportService.markAsReadBatch(ids, username);
        return ResponseEntity.ok(java.util.Map.of("success", true));
    }

    @PostMapping("/batch-status")
    @PreAuthorize("@perm.can('bugReports', 'EDIT')")
    public ResponseEntity<java.util.Map<String, Object>> updateStatusBatch(
            @RequestBody java.util.Map<String, Object> payload,
            Authentication authentication) {
        Object rawIds = payload != null ? payload.get("ids") : null;
        String status = payload != null && payload.get("status") != null ? payload.get("status").toString() : "IN_PROGRESS";
        String username = authentication != null ? authentication.getName() : "ADMIN";
        if (rawIds instanceof java.util.List<?>) {
            java.util.List<Long> ids = ((java.util.List<?>) rawIds).stream()
                    .map(o -> Long.valueOf(o.toString()))
                    .collect(java.util.stream.Collectors.toList());
            bugReportService.updateStatusBatch(ids, status, username);
        }
        return ResponseEntity.ok(java.util.Map.of("success", true, "status", status));
    }

    @PostMapping("/read-all")
    @PreAuthorize("@perm.can('bugReports', 'EDIT')")
    public ResponseEntity<java.util.Map<String, Object>> markAllAsRead(Authentication authentication) {
        String username = authentication != null ? authentication.getName() : "ADMIN";
        bugReportService.markAllAsRead(username);
        return ResponseEntity.ok(java.util.Map.of("success", true));
    }

    @GetMapping("/open-count")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<java.util.Map<String, Long>> getOpenCount() {
        return ResponseEntity.ok(java.util.Map.of("openCount", bugReportService.getOpenReportCount()));
    }
}
