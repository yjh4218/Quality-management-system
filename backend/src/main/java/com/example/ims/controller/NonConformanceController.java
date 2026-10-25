package com.example.ims.controller;

import com.example.ims.dto.*;
import com.example.ims.entity.*;
import com.example.ims.service.NonConformanceService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

/**
 * ⚠️ 부적합품 관리 및 출하승인 REST Controller
 * ISO 13485:2016 §8.3 / ISO 22716:2007 §8.4 / 21 CFR 820.90
 */
@RestController
@RequestMapping("/api/ncr")
@RequiredArgsConstructor
public class NonConformanceController {

    private final NonConformanceService service;

    // =========================================================================
    // 0. KPI 요약 지표
    // =========================================================================

    @GetMapping("/kpis")
    @PreAuthorize("@perm.can('ncrManagement', 'VIEW') or hasAnyRole('ADMIN', 'USER')")
    public ResponseEntity<NcrKpiResponse> getKpis() {
        return ResponseEntity.ok(service.getKpis());
    }

    // =========================================================================
    // 1. NCR 보고서 목록 조회 및 검색
    // =========================================================================

    @GetMapping
    @PreAuthorize("@perm.can('ncrManagement', 'VIEW') or hasAnyRole('ADMIN', 'USER')")
    public ResponseEntity<Page<NonConformanceReportResponse>> searchNcrs(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) NcrOccurrenceStage stage,
            @RequestParam(required = false) NcrSeverity severity,
            @RequestParam(required = false) NcrStatus status,
            @RequestParam(required = false) QuarantineStatus quarantineStatus,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "15") int size
    ) {
        Pageable pageable = PageRequest.of(page, size);
        return ResponseEntity.ok(service.searchNcrs(keyword, stage, severity, status, quarantineStatus, pageable));
    }

    @GetMapping("/{id}")
    @PreAuthorize("@perm.can('ncrManagement', 'VIEW') or hasAnyRole('ADMIN', 'USER')")
    public ResponseEntity<NonConformanceReportResponse> getNcrById(@PathVariable Long id) {
        return ResponseEntity.ok(service.getNcrById(id));
    }

    @GetMapping("/by-number/{ncrNumber}")
    @PreAuthorize("@perm.can('ncrManagement', 'VIEW') or hasAnyRole('ADMIN', 'USER')")
    public ResponseEntity<NonConformanceReportResponse> getNcrByNumber(@PathVariable String ncrNumber) {
        return ResponseEntity.ok(service.getNcrByNumber(ncrNumber));
    }

    // =========================================================================
    // 2. NCR 등록, 수정 및 입고 연동
    // =========================================================================

    @PostMapping
    @PreAuthorize("@perm.can('ncrManagement', 'CREATE') or hasAnyRole('ADMIN', 'USER')")
    public ResponseEntity<NonConformanceReportResponse> createNcr(
            @Valid @RequestBody NcrCreateRequest req,
            Authentication auth
    ) {
        String username = auth != null ? auth.getName() : "system";
        return ResponseEntity.status(HttpStatus.CREATED).body(service.createNcr(req, username));
    }

    @PostMapping("/from-inbound/{inboundId}")
    @PreAuthorize("@perm.can('ncrManagement', 'CREATE') or hasAnyRole('ADMIN', 'USER')")
    public ResponseEntity<NonConformanceReportResponse> createFromInbound(
            @PathVariable Long inboundId,
            Authentication auth
    ) {
        String username = auth != null ? auth.getName() : "system";
        return ResponseEntity.status(HttpStatus.CREATED).body(service.createFromInbound(inboundId, username));
    }

    @PutMapping("/{id}")
    @PreAuthorize("@perm.can('ncrManagement', 'UPDATE') or hasAnyRole('ADMIN', 'USER')")
    public ResponseEntity<NonConformanceReportResponse> updateNcr(
            @PathVariable Long id,
            @Valid @RequestBody NcrUpdateRequest req,
            Authentication auth
    ) {
        String username = auth != null ? auth.getName() : "system";
        return ResponseEntity.ok(service.updateNcr(id, req, username));
    }

    // =========================================================================
    // 3. 원인조사, 처리방안(Disposition) 및 격리상태 변경
    // =========================================================================

    @PatchMapping("/{id}/investigation")
    @PreAuthorize("@perm.can('ncrManagement', 'UPDATE') or hasAnyRole('ADMIN', 'USER')")
    public ResponseEntity<NonConformanceReportResponse> submitInvestigation(
            @PathVariable Long id,
            @Valid @RequestBody NcrInvestigationRequest req,
            Authentication auth
    ) {
        String username = auth != null ? auth.getName() : "system";
        return ResponseEntity.ok(service.submitInvestigation(id, req, username));
    }

    @PostMapping("/{id}/disposition")
    @PreAuthorize("@perm.can('ncrManagement', 'APPROVE') or hasAnyRole('ADMIN', 'USER')")
    public ResponseEntity<NonConformanceReportResponse> decideDisposition(
            @PathVariable Long id,
            @Valid @RequestBody NcrDispositionRequest req,
            Authentication auth
    ) {
        String username = auth != null ? auth.getName() : "system";
        return ResponseEntity.ok(service.decideDisposition(id, req, username));
    }

    @PatchMapping("/{id}/quarantine")
    @PreAuthorize("@perm.can('ncrManagement', 'UPDATE') or hasAnyRole('ADMIN', 'USER')")
    public ResponseEntity<NonConformanceReportResponse> updateQuarantine(
            @PathVariable Long id,
            @Valid @RequestBody NcrQuarantineUpdateRequest req,
            Authentication auth
    ) {
        String username = auth != null ? auth.getName() : "system";
        return ResponseEntity.ok(service.updateQuarantine(id, req, username));
    }

    @PostMapping("/{id}/close")
    @PreAuthorize("@perm.can('ncrManagement', 'APPROVE') or hasAnyRole('ADMIN', 'USER')")
    public ResponseEntity<NonConformanceReportResponse> closeNcr(
            @PathVariable Long id,
            @Valid @RequestBody NcrCloseRequest req,
            Authentication auth
    ) {
        String username = auth != null ? auth.getName() : "system";
        return ResponseEntity.ok(service.closeNcr(id, req, username));
    }

    // =========================================================================
    // 4. 출하 승인 게이트 적격성 검증 (Market Release Gate)
    // =========================================================================

    @GetMapping("/check-release-eligibility")
    @PreAuthorize("@perm.can('ncrManagement', 'VIEW') or hasAnyRole('ADMIN', 'USER')")
    public ResponseEntity<ReleaseEligibilityResponse> checkReleaseEligibility(
            @RequestParam(required = false) String lotNumber,
            @RequestParam(required = false) String itemCode,
            @RequestParam(required = false) Long inboundId
    ) {
        return ResponseEntity.ok(service.checkReleaseEligibility(lotNumber, itemCode, inboundId));
    }

    // =========================================================================
    // 5. 조치 과제(Action Items) 서브 엔티티 관리
    // =========================================================================

    @PostMapping("/{id}/actions")
    @PreAuthorize("@perm.can('ncrManagement', 'CREATE') or hasAnyRole('ADMIN', 'USER')")
    public ResponseEntity<NcrActionItemResponse> addActionItem(
            @PathVariable Long id,
            @Valid @RequestBody NcrActionItemRequest req,
            Authentication auth
    ) {
        String username = auth != null ? auth.getName() : "system";
        return ResponseEntity.status(HttpStatus.CREATED).body(service.addActionItem(id, req, username));
    }

    @PatchMapping("/actions/{actionId}/complete")
    @PreAuthorize("@perm.can('ncrManagement', 'UPDATE') or hasAnyRole('ADMIN', 'USER')")
    public ResponseEntity<NcrActionItemResponse> completeActionItem(
            @PathVariable Long actionId,
            Authentication auth
    ) {
        String username = auth != null ? auth.getName() : "system";
        return ResponseEntity.ok(service.completeActionItem(actionId, username));
    }

    @PatchMapping("/actions/{actionId}/verify")
    @PreAuthorize("@perm.can('ncrManagement', 'APPROVE') or hasAnyRole('ADMIN', 'USER')")
    public ResponseEntity<NcrActionItemResponse> verifyActionItem(
            @PathVariable Long actionId,
            @RequestParam VerificationResult result,
            @RequestParam(required = false) String notes,
            Authentication auth
    ) {
        String username = auth != null ? auth.getName() : "system";
        return ResponseEntity.ok(service.verifyActionItem(actionId, result, notes, username));
    }

    @DeleteMapping("/actions/{actionId}")
    @PreAuthorize("@perm.can('ncrManagement', 'DELETE') or hasAnyRole('ADMIN', 'USER')")
    public ResponseEntity<Void> deleteActionItem(
            @PathVariable Long actionId,
            Authentication auth
    ) {
        String username = auth != null ? auth.getName() : "system";
        service.deleteActionItem(actionId, username);
        return ResponseEntity.noContent().build();
    }
}
