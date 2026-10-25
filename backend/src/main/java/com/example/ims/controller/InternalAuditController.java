package com.example.ims.controller;

import com.example.ims.dto.*;
import com.example.ims.service.InternalAuditService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/internal-audits")
@RequiredArgsConstructor
public class InternalAuditController {

    private final InternalAuditService auditService;

    // =========================================================================
    // KPI
    // =========================================================================

    @GetMapping("/kpi")
    @PreAuthorize("hasAnyRole('ADMIN', 'QUALITY', 'QUALITY_TEAM', 'RESPONSIBLE_SALES', 'USER') or hasAuthority('AUDIT_VIEW')")
    public ResponseEntity<InternalAuditKpiResponse> getInternalAuditKpi() {
        return ResponseEntity.ok(auditService.getInternalAuditKpi());
    }

    // =========================================================================
    // 1. 내부심사 계획 및 관리 (Internal Audits)
    // =========================================================================

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'QUALITY', 'QUALITY_TEAM', 'RESPONSIBLE_SALES', 'USER') or hasAuthority('AUDIT_VIEW')")
    public ResponseEntity<List<InternalAuditResponse>> getAllAudits() {
        return ResponseEntity.ok(auditService.getAllAudits());
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'QUALITY', 'QUALITY_TEAM', 'RESPONSIBLE_SALES', 'USER') or hasAuthority('AUDIT_VIEW')")
    public ResponseEntity<InternalAuditResponse> getAuditById(@PathVariable Long id) {
        return ResponseEntity.ok(auditService.getAuditById(id));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'QUALITY', 'QUALITY_TEAM', 'RESPONSIBLE_SALES', 'USER') or hasAuthority('AUDIT_MANAGE')")
    public ResponseEntity<InternalAuditResponse> createAudit(
            @Valid @RequestBody InternalAuditRequest req,
            Authentication authentication) {
        String username = authentication != null ? authentication.getName() : "admin";
        return ResponseEntity.status(HttpStatus.CREATED).body(auditService.createAudit(req, username));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'QUALITY', 'QUALITY_TEAM', 'RESPONSIBLE_SALES', 'USER') or hasAuthority('AUDIT_MANAGE')")
    public ResponseEntity<InternalAuditResponse> updateAudit(
            @PathVariable Long id,
            @Valid @RequestBody InternalAuditRequest req,
            Authentication authentication) {
        String username = authentication != null ? authentication.getName() : "admin";
        return ResponseEntity.ok(auditService.updateAudit(id, req, username));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'QUALITY', 'QUALITY_TEAM', 'RESPONSIBLE_SALES', 'USER') or hasAuthority('AUDIT_MANAGE')")
    public ResponseEntity<Map<String, String>> deleteAudit(
            @PathVariable Long id,
            Authentication authentication) {
        String username = authentication != null ? authentication.getName() : "admin";
        auditService.deleteAudit(id, username);
        return ResponseEntity.ok(Map.of("message", "내부심사 계획이 삭제되었습니다.", "id", id.toString()));
    }

    // =========================================================================
    // 2. 심사 체크리스트 (Audit Checklists)
    // =========================================================================

    @GetMapping("/{auditId}/checklists")
    @PreAuthorize("hasAnyRole('ADMIN', 'QUALITY', 'QUALITY_TEAM', 'RESPONSIBLE_SALES', 'USER') or hasAuthority('AUDIT_VIEW')")
    public ResponseEntity<List<AuditChecklistResponse>> getChecklistsByAudit(@PathVariable Long auditId) {
        return ResponseEntity.ok(auditService.getChecklistsByAudit(auditId));
    }

    @PostMapping("/checklists")
    @PreAuthorize("hasAnyRole('ADMIN', 'QUALITY', 'QUALITY_TEAM', 'RESPONSIBLE_SALES', 'USER') or hasAuthority('AUDIT_MANAGE')")
    public ResponseEntity<AuditChecklistResponse> createChecklist(
            @Valid @RequestBody AuditChecklistRequest req,
            Authentication authentication) {
        String username = authentication != null ? authentication.getName() : "admin";
        return ResponseEntity.status(HttpStatus.CREATED).body(auditService.createChecklist(req, username));
    }

    @PutMapping("/checklists/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'QUALITY', 'QUALITY_TEAM', 'RESPONSIBLE_SALES', 'USER') or hasAuthority('AUDIT_MANAGE')")
    public ResponseEntity<AuditChecklistResponse> updateChecklist(
            @PathVariable Long id,
            @Valid @RequestBody AuditChecklistRequest req,
            Authentication authentication) {
        String username = authentication != null ? authentication.getName() : "admin";
        return ResponseEntity.ok(auditService.updateChecklist(id, req, username));
    }

    @DeleteMapping("/checklists/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'QUALITY', 'QUALITY_TEAM', 'RESPONSIBLE_SALES', 'USER') or hasAuthority('AUDIT_MANAGE')")
    public ResponseEntity<Map<String, String>> deleteChecklist(@PathVariable Long id) {
        auditService.deleteChecklist(id);
        return ResponseEntity.ok(Map.of("message", "체크리스트 항목이 삭제되었습니다.", "id", id.toString()));
    }

    // =========================================================================
    // 3. 심사 지적사항 (Audit Findings)
    // =========================================================================

    @GetMapping("/findings")
    @PreAuthorize("hasAnyRole('ADMIN', 'QUALITY', 'QUALITY_TEAM', 'RESPONSIBLE_SALES', 'USER') or hasAuthority('AUDIT_VIEW')")
    public ResponseEntity<List<AuditFindingResponse>> getAllFindings() {
        return ResponseEntity.ok(auditService.getAllFindings());
    }

    @GetMapping("/{auditId}/findings")
    @PreAuthorize("hasAnyRole('ADMIN', 'QUALITY', 'QUALITY_TEAM', 'RESPONSIBLE_SALES', 'USER') or hasAuthority('AUDIT_VIEW')")
    public ResponseEntity<List<AuditFindingResponse>> getFindingsByAudit(@PathVariable Long auditId) {
        return ResponseEntity.ok(auditService.getFindingsByAudit(auditId));
    }

    @PostMapping("/findings")
    @PreAuthorize("hasAnyRole('ADMIN', 'QUALITY', 'QUALITY_TEAM', 'RESPONSIBLE_SALES', 'USER') or hasAuthority('AUDIT_MANAGE')")
    public ResponseEntity<AuditFindingResponse> createFinding(
            @Valid @RequestBody AuditFindingRequest req,
            Authentication authentication) {
        String username = authentication != null ? authentication.getName() : "admin";
        return ResponseEntity.status(HttpStatus.CREATED).body(auditService.createFinding(req, username));
    }

    @PutMapping("/findings/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'QUALITY', 'QUALITY_TEAM', 'RESPONSIBLE_SALES', 'USER') or hasAuthority('AUDIT_MANAGE')")
    public ResponseEntity<AuditFindingResponse> updateFinding(
            @PathVariable Long id,
            @Valid @RequestBody AuditFindingRequest req,
            Authentication authentication) {
        String username = authentication != null ? authentication.getName() : "admin";
        return ResponseEntity.ok(auditService.updateFinding(id, req, username));
    }

    @DeleteMapping("/findings/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'QUALITY', 'QUALITY_TEAM', 'RESPONSIBLE_SALES', 'USER') or hasAuthority('AUDIT_MANAGE')")
    public ResponseEntity<Map<String, String>> deleteFinding(
            @PathVariable Long id,
            Authentication authentication) {
        String username = authentication != null ? authentication.getName() : "admin";
        auditService.deleteFinding(id, username);
        return ResponseEntity.ok(Map.of("message", "지적사항이 삭제되었습니다.", "id", id.toString()));
    }

    // =========================================================================
    // 4. 경영검토 (Management Reviews)
    // =========================================================================

    @GetMapping("/management-reviews")
    @PreAuthorize("hasAnyRole('ADMIN', 'QUALITY', 'QUALITY_TEAM', 'RESPONSIBLE_SALES', 'USER') or hasAuthority('AUDIT_VIEW')")
    public ResponseEntity<List<ManagementReviewResponse>> getAllReviews() {
        return ResponseEntity.ok(auditService.getAllReviews());
    }

    @GetMapping("/management-reviews/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'QUALITY', 'QUALITY_TEAM', 'RESPONSIBLE_SALES', 'USER') or hasAuthority('AUDIT_VIEW')")
    public ResponseEntity<ManagementReviewResponse> getReviewById(@PathVariable Long id) {
        return ResponseEntity.ok(auditService.getReviewById(id));
    }

    @PostMapping("/management-reviews")
    @PreAuthorize("hasAnyRole('ADMIN', 'QUALITY', 'QUALITY_TEAM', 'RESPONSIBLE_SALES', 'USER') or hasAuthority('AUDIT_MANAGE')")
    public ResponseEntity<ManagementReviewResponse> createReview(
            @Valid @RequestBody ManagementReviewRequest req,
            Authentication authentication) {
        String username = authentication != null ? authentication.getName() : "admin";
        return ResponseEntity.status(HttpStatus.CREATED).body(auditService.createReview(req, username));
    }

    @PutMapping("/management-reviews/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'QUALITY', 'QUALITY_TEAM', 'RESPONSIBLE_SALES', 'USER') or hasAuthority('AUDIT_MANAGE')")
    public ResponseEntity<ManagementReviewResponse> updateReview(
            @PathVariable Long id,
            @Valid @RequestBody ManagementReviewRequest req,
            Authentication authentication) {
        String username = authentication != null ? authentication.getName() : "admin";
        return ResponseEntity.ok(auditService.updateReview(id, req, username));
    }

    @DeleteMapping("/management-reviews/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'QUALITY', 'QUALITY_TEAM', 'RESPONSIBLE_SALES', 'USER') or hasAuthority('AUDIT_MANAGE')")
    public ResponseEntity<Map<String, String>> deleteReview(
            @PathVariable Long id,
            Authentication authentication) {
        String username = authentication != null ? authentication.getName() : "admin";
        auditService.deleteReview(id, username);
        return ResponseEntity.ok(Map.of("message", "경영검토 기록이 삭제되었습니다.", "id", id.toString()));
    }
}
