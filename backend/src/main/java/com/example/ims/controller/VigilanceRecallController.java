package com.example.ims.controller;

import com.example.ims.dto.*;
import com.example.ims.entity.RecallStatus;
import com.example.ims.entity.VigilanceSubmissionStatus;
import com.example.ims.service.VigilanceRecallService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class VigilanceRecallController {

    private final VigilanceRecallService service;

    // =========================================================================
    // 1. KPI 지표
    // =========================================================================

    @GetMapping("/vigilance-recall/kpi")
    @PreAuthorize("hasAnyRole('ADMIN', 'QUALITY', 'QUALITY_TEAM', 'RESPONSIBLE_SALES', 'USER') or hasAuthority('VIEW_VIGILANCE')")
    public ResponseEntity<VigilanceRecallKpiResponse> getKpiSummary() {
        return ResponseEntity.ok(service.getKpiMetrics());
    }

    // =========================================================================
    // 2. 규제보고 (Vigilance) Endpoints
    // =========================================================================

    @GetMapping("/vigilance")
    @PreAuthorize("hasAnyRole('ADMIN', 'QUALITY', 'QUALITY_TEAM', 'RESPONSIBLE_SALES', 'USER') or hasAuthority('VIEW_VIGILANCE')")
    public ResponseEntity<List<VigilanceReportResponse>> getAllVigilanceReports() {
        return ResponseEntity.ok(service.getAllVigilanceReports());
    }

    @GetMapping("/vigilance/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'QUALITY', 'QUALITY_TEAM', 'RESPONSIBLE_SALES', 'USER') or hasAuthority('VIEW_VIGILANCE')")
    public ResponseEntity<VigilanceReportResponse> getVigilanceReport(@PathVariable Long id) {
        return ResponseEntity.ok(service.getVigilanceReport(id));
    }

    @PostMapping("/vigilance")
    @PreAuthorize("hasAnyRole('ADMIN', 'QUALITY', 'QUALITY_TEAM', 'RESPONSIBLE_SALES', 'USER') or hasAuthority('MANAGE_VIGILANCE')")
    public ResponseEntity<VigilanceReportResponse> createVigilanceReport(
            @Valid @RequestBody VigilanceReportRequest req,
            Authentication authentication) {
        String username = authentication != null ? authentication.getName() : "system";
        return ResponseEntity.status(HttpStatus.CREATED).body(service.createVigilanceReport(req, username));
    }

    @PutMapping("/vigilance/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'QUALITY', 'QUALITY_TEAM', 'RESPONSIBLE_SALES', 'USER') or hasAuthority('MANAGE_VIGILANCE')")
    public ResponseEntity<VigilanceReportResponse> updateVigilanceReport(
            @PathVariable Long id,
            @Valid @RequestBody VigilanceReportRequest req,
            Authentication authentication) {
        String username = authentication != null ? authentication.getName() : "system";
        return ResponseEntity.ok(service.updateVigilanceReport(id, req, username));
    }

    @PostMapping("/vigilance/{id}/submit")
    @PreAuthorize("hasAnyRole('ADMIN', 'QUALITY', 'QUALITY_TEAM', 'RESPONSIBLE_SALES', 'USER') or hasAuthority('MANAGE_VIGILANCE')")
    public ResponseEntity<VigilanceReportResponse> submitVigilanceReport(
            @PathVariable Long id,
            @RequestBody Map<String, Object> body,
            Authentication authentication) {
        String username = authentication != null ? authentication.getName() : "system";
        String submissionNumber = (String) body.get("authoritySubmissionNumber");
        String dateStr = (String) body.get("submissionDate");
        LocalDate submissionDate = dateStr != null && !dateStr.isBlank() ? LocalDate.parse(dateStr) : LocalDate.now();

        return ResponseEntity.ok(service.submitVigilanceReport(id, submissionNumber, submissionDate, username));
    }

    @PostMapping("/vigilance/{id}/status")
    @PreAuthorize("hasAnyRole('ADMIN', 'QUALITY', 'QUALITY_TEAM', 'RESPONSIBLE_SALES', 'USER') or hasAuthority('MANAGE_VIGILANCE')")
    public ResponseEntity<VigilanceReportResponse> transitionVigilanceStatus(
            @PathVariable Long id,
            @RequestBody Map<String, String> body,
            Authentication authentication) {
        String username = authentication != null ? authentication.getName() : "system";
        VigilanceSubmissionStatus targetStatus = VigilanceSubmissionStatus.valueOf(body.get("status"));
        return ResponseEntity.ok(service.transitionVigilanceStatus(id, targetStatus, username));
    }

    @DeleteMapping("/vigilance/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'QUALITY', 'QUALITY_TEAM') or hasAuthority('MANAGE_VIGILANCE')")
    public ResponseEntity<Void> deleteVigilanceReport(
            @PathVariable Long id,
            Authentication authentication) {
        String username = authentication != null ? authentication.getName() : "system";
        service.deleteVigilanceReport(id, username);
        return ResponseEntity.noContent().build();
    }

    // =========================================================================
    // 3. 제품 회수 (Product Recall) Endpoints
    // =========================================================================

    @GetMapping("/recalls")
    @PreAuthorize("hasAnyRole('ADMIN', 'QUALITY', 'QUALITY_TEAM', 'RESPONSIBLE_SALES', 'USER') or hasAuthority('VIEW_VIGILANCE')")
    public ResponseEntity<List<ProductRecallResponse>> getAllRecalls() {
        return ResponseEntity.ok(service.getAllRecalls());
    }

    @GetMapping("/recalls/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'QUALITY', 'QUALITY_TEAM', 'RESPONSIBLE_SALES', 'USER') or hasAuthority('VIEW_VIGILANCE')")
    public ResponseEntity<ProductRecallResponse> getRecall(@PathVariable Long id) {
        return ResponseEntity.ok(service.getRecall(id));
    }

    @PostMapping("/recalls")
    @PreAuthorize("hasAnyRole('ADMIN', 'QUALITY', 'QUALITY_TEAM', 'RESPONSIBLE_SALES', 'USER') or hasAuthority('MANAGE_VIGILANCE')")
    public ResponseEntity<ProductRecallResponse> createRecall(
            @Valid @RequestBody ProductRecallRequest req,
            Authentication authentication) {
        String username = authentication != null ? authentication.getName() : "system";
        return ResponseEntity.status(HttpStatus.CREATED).body(service.createRecall(req, username));
    }

    @PutMapping("/recalls/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'QUALITY', 'QUALITY_TEAM', 'RESPONSIBLE_SALES', 'USER') or hasAuthority('MANAGE_VIGILANCE')")
    public ResponseEntity<ProductRecallResponse> updateRecall(
            @PathVariable Long id,
            @Valid @RequestBody ProductRecallRequest req,
            Authentication authentication) {
        String username = authentication != null ? authentication.getName() : "system";
        return ResponseEntity.ok(service.updateRecall(id, req, username));
    }

    @PutMapping("/recalls/{id}/reconciliation")
    @PreAuthorize("hasAnyRole('ADMIN', 'QUALITY', 'QUALITY_TEAM', 'RESPONSIBLE_SALES', 'USER') or hasAuthority('MANAGE_VIGILANCE')")
    public ResponseEntity<ProductRecallResponse> updateReconciliation(
            @PathVariable Long id,
            @Valid @RequestBody RecallReconciliationRequest req,
            Authentication authentication) {
        String username = authentication != null ? authentication.getName() : "system";
        return ResponseEntity.ok(service.updateReconciliation(id, req, username));
    }

    @PostMapping("/recalls/{id}/status")
    @PreAuthorize("hasAnyRole('ADMIN', 'QUALITY', 'QUALITY_TEAM', 'RESPONSIBLE_SALES', 'USER') or hasAuthority('MANAGE_VIGILANCE')")
    public ResponseEntity<ProductRecallResponse> transitionRecallStatus(
            @PathVariable Long id,
            @RequestBody Map<String, String> body,
            Authentication authentication) {
        String username = authentication != null ? authentication.getName() : "system";
        RecallStatus targetStatus = RecallStatus.valueOf(body.get("status"));
        String notes = body.get("closureSummary");
        return ResponseEntity.ok(service.transitionRecallStatus(id, targetStatus, notes, username));
    }

    @DeleteMapping("/recalls/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'QUALITY', 'QUALITY_TEAM') or hasAuthority('MANAGE_VIGILANCE')")
    public ResponseEntity<Void> deleteRecall(
            @PathVariable Long id,
            Authentication authentication) {
        String username = authentication != null ? authentication.getName() : "system";
        service.deleteRecall(id, username);
        return ResponseEntity.noContent().build();
    }
}
