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
    public ResponseEntity<BugReport> submitReport(@RequestBody BugReport report, Authentication authentication) {
        BugReport targetReport = (report != null) ? report : new BugReport();
        if (authentication != null && authentication.isAuthenticated()) {
            String username = authentication.getName();
            if (username != null && !username.trim().isEmpty() && !"anonymousUser".equalsIgnoreCase(username)) {
                targetReport.setReporterUsername(username);
                userRepository.findByUsername(username).ifPresent(u -> {
                    targetReport.setReporterName(u.getName());
                });
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
