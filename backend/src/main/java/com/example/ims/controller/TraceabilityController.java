package com.example.ims.controller;

import com.example.ims.dto.*;
import com.example.ims.entity.*;
import com.example.ims.service.TraceabilityService;
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

import java.util.List;

/**
 * 🌐 외부연계 및 양방향 추적성 관리 REST Controller
 * ISO 13485:2016 §7.5.8 / ISO 22716:2007 §8.3 / 21 CFR 820.65 / 820.120
 * DEC-02: ERP/WMS 수기 대사 지원
 */
@RestController
@RequestMapping("/api/traceability")
@RequiredArgsConstructor
public class TraceabilityController {

    private final TraceabilityService service;

    // =========================================================================
    // 0. KPI 요약 지표
    // =========================================================================

    @GetMapping("/kpis")
    @PreAuthorize("@perm.can('traceabilityManagement', 'VIEW') or hasAnyRole('ADMIN', 'USER')")
    public ResponseEntity<TraceabilityKpiResponse> getTraceabilityKpis() {
        return ResponseEntity.ok(service.getTraceabilityKpis());
    }

    // =========================================================================
    // 1. 배치/LOT 마스터
    // =========================================================================

    @GetMapping("/batches")
    @PreAuthorize("@perm.can('traceabilityManagement', 'VIEW') or hasAnyRole('ADMIN', 'USER')")
    public ResponseEntity<Page<TraceabilityBatchResponse>> searchBatches(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) BatchStage batchStage,
            @RequestParam(required = false) TraceabilityQualityStatus qualityStatus,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "15") int size) {
        Pageable pageable = PageRequest.of(page, size);
        return ResponseEntity.ok(service.searchBatches(keyword, batchStage, qualityStatus, pageable));
    }

    @GetMapping("/batches/{id}")
    @PreAuthorize("@perm.can('traceabilityManagement', 'VIEW') or hasAnyRole('ADMIN', 'USER')")
    public ResponseEntity<TraceabilityBatchResponse> getBatchById(@PathVariable Long id) {
        return ResponseEntity.ok(service.getBatchById(id));
    }

    @GetMapping("/batches/number/{batchNumber}")
    @PreAuthorize("@perm.can('traceabilityManagement', 'VIEW') or hasAnyRole('ADMIN', 'USER')")
    public ResponseEntity<TraceabilityBatchResponse> getBatchByNumber(@PathVariable String batchNumber) {
        return ResponseEntity.ok(service.getBatchByNumber(batchNumber));
    }

    @PostMapping("/batches")
    @PreAuthorize("@perm.can('traceabilityManagement', 'CREATE') or hasRole('ADMIN')")
    public ResponseEntity<TraceabilityBatchResponse> createBatch(
            @Valid @RequestBody TraceabilityBatchRequest request,
            Authentication authentication) {
        String username = authentication != null ? authentication.getName() : "system";
        return ResponseEntity.status(HttpStatus.CREATED).body(service.createBatch(request, username));
    }

    @PutMapping("/batches/{id}")
    @PreAuthorize("@perm.can('traceabilityManagement', 'EDIT') or hasRole('ADMIN')")
    public ResponseEntity<TraceabilityBatchResponse> updateBatch(
            @PathVariable Long id,
            @Valid @RequestBody TraceabilityBatchRequest request,
            Authentication authentication) {
        String username = authentication != null ? authentication.getName() : "system";
        return ResponseEntity.ok(service.updateBatch(id, request, username));
    }

    @DeleteMapping("/batches/{id}")
    @PreAuthorize("@perm.can('traceabilityManagement', 'DELETE') or hasRole('ADMIN')")
    public ResponseEntity<Void> deleteBatch(@PathVariable Long id, Authentication authentication) {
        String username = authentication != null ? authentication.getName() : "system";
        service.deleteBatch(id, username);
        return ResponseEntity.noContent().build();
    }

    // =========================================================================
    // 2. 투입 연결 관계 (Links)
    // =========================================================================

    @GetMapping("/links")
    @PreAuthorize("@perm.can('traceabilityManagement', 'VIEW') or hasAnyRole('ADMIN', 'USER')")
    public ResponseEntity<List<TraceabilityLinkResponse>> getLinksForBatch(
            @RequestParam String batchNumber) {
        return ResponseEntity.ok(service.getLinksForBatch(batchNumber));
    }

    @PostMapping("/links")
    @PreAuthorize("@perm.can('traceabilityManagement', 'CREATE') or hasRole('ADMIN')")
    public ResponseEntity<TraceabilityLinkResponse> createLink(
            @Valid @RequestBody TraceabilityLinkRequest request,
            Authentication authentication) {
        String username = authentication != null ? authentication.getName() : "system";
        return ResponseEntity.status(HttpStatus.CREATED).body(service.createLink(request, username));
    }

    @DeleteMapping("/links/{id}")
    @PreAuthorize("@perm.can('traceabilityManagement', 'DELETE') or hasRole('ADMIN')")
    public ResponseEntity<Void> deleteLink(@PathVariable Long id, Authentication authentication) {
        String username = authentication != null ? authentication.getName() : "system";
        service.deleteLink(id, username);
        return ResponseEntity.noContent().build();
    }

    // =========================================================================
    // 3. 양방향 추적성 매트릭스 탐색
    // =========================================================================

    @GetMapping("/matrix")
    @PreAuthorize("@perm.can('traceabilityManagement', 'VIEW') or hasAnyRole('ADMIN', 'USER')")
    public ResponseEntity<TraceabilityMatrixResponse> getBidirectionalTraceability(
            @RequestParam String batchNumber,
            @RequestParam(required = false, defaultValue = "BOTH") String direction) {
        return ResponseEntity.ok(service.getBidirectionalTraceability(batchNumber, direction));
    }

    // =========================================================================
    // 4. 외부 시스템 연동 및 수기 대사 (DEC-02)
    // =========================================================================

    @GetMapping("/integrations")
    @PreAuthorize("@perm.can('traceabilityManagement', 'VIEW') or hasAnyRole('ADMIN', 'USER')")
    public ResponseEntity<Page<ExternalIntegrationResponse>> searchIntegrationLogs(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) IntegrationSystemType systemType,
            @RequestParam(required = false) IntegrationStatus status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "15") int size) {
        Pageable pageable = PageRequest.of(page, size);
        return ResponseEntity.ok(service.searchIntegrationLogs(keyword, systemType, status, pageable));
    }

    @PostMapping("/integrations")
    @PreAuthorize("@perm.can('traceabilityManagement', 'CREATE') or hasRole('ADMIN')")
    public ResponseEntity<ExternalIntegrationResponse> createIntegrationLog(
            @Valid @RequestBody ExternalIntegrationRequest request,
            Authentication authentication) {
        String username = authentication != null ? authentication.getName() : "system";
        return ResponseEntity.status(HttpStatus.CREATED).body(service.createIntegrationLog(request, username));
    }

    @PostMapping("/integrations/{id}/reconcile")
    @PreAuthorize("@perm.can('traceabilityManagement', 'EDIT') or hasRole('ADMIN')")
    public ResponseEntity<ExternalIntegrationResponse> reconcileLog(
            @PathVariable Long id,
            @Valid @RequestBody ReconciliationActionRequest request,
            Authentication authentication) {
        String username = authentication != null ? authentication.getName() : "system";
        return ResponseEntity.ok(service.reconcileLog(id, request, username));
    }

    // =========================================================================
    // 5. GS1 UDI 바코드 및 QR 코드 식별
    // =========================================================================

    @GetMapping("/barcodes")
    @PreAuthorize("@perm.can('traceabilityManagement', 'VIEW') or hasAnyRole('ADMIN', 'USER')")
    public ResponseEntity<Page<BarcodeRecordResponse>> searchBarcodes(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) BarcodeType barcodeType,
            @RequestParam(required = false) BarcodeStatus status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "15") int size) {
        Pageable pageable = PageRequest.of(page, size);
        return ResponseEntity.ok(service.searchBarcodes(keyword, barcodeType, status, pageable));
    }

    @PostMapping("/barcodes")
    @PreAuthorize("@perm.can('traceabilityManagement', 'CREATE') or hasRole('ADMIN')")
    public ResponseEntity<BarcodeRecordResponse> issueBarcode(
            @Valid @RequestBody BarcodeIssueRequest request,
            Authentication authentication) {
        String username = authentication != null ? authentication.getName() : "system";
        return ResponseEntity.status(HttpStatus.CREATED).body(service.issueBarcode(request, username));
    }

    @PostMapping("/barcodes/{id}/print")
    @PreAuthorize("@perm.can('traceabilityManagement', 'VIEW') or hasAnyRole('ADMIN', 'USER')")
    public ResponseEntity<BarcodeRecordResponse> incrementBarcodePrint(
            @PathVariable Long id,
            Authentication authentication) {
        String username = authentication != null ? authentication.getName() : "system";
        return ResponseEntity.ok(service.incrementBarcodePrint(id, username));
    }
}
