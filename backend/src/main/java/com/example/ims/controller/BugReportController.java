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
import java.util.Map;

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
    public ResponseEntity<BugReport> updateStatus(@PathVariable Long id, @RequestBody Map<String, String> payload) {
        String status = payload.get("status");
        return ResponseEntity.ok(bugReportService.updateStatus(id, status));
    }
}
