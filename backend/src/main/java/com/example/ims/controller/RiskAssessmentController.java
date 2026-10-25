package com.example.ims.controller;

import com.example.ims.dto.RiskAssessmentRequest;
import com.example.ims.dto.RiskAssessmentResponse;
import com.example.ims.dto.RiskHazardItemRequest;
import com.example.ims.dto.RiskKpiResponse;
import com.example.ims.entity.RiskHazardItem;
import com.example.ims.service.RiskAssessmentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * ⚠️ ISO 14971:2019 위험관리 (Risk Management) REST API 컨트롤러
 * 의료기기 위해요인 식별, FMEA 통제 조치 및 잔여위험 평가를 제공합니다.
 */
@RestController
@RequestMapping("/api/quality/risks")
@RequiredArgsConstructor
public class RiskAssessmentController {

    private final RiskAssessmentService service;

    // =========================================================================
    // 1. 위험성 평가 문서 (Risk Assessments)
    // =========================================================================

    @GetMapping
    @PreAuthorize("@perm.can('riskManagement', 'VIEW') or hasAnyRole('ADMIN', 'USER')")
    public ResponseEntity<Page<RiskAssessmentResponse>> getAssessments(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String targetFamily,
            @RequestParam(required = false) String riskPhase,
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        return ResponseEntity.ok(service.getAssessments(keyword, targetFamily, riskPhase, status, page, size));
    }

    @GetMapping("/{id}")
    @PreAuthorize("@perm.can('riskManagement', 'VIEW') or hasAnyRole('ADMIN', 'USER')")
    public ResponseEntity<RiskAssessmentResponse> getAssessmentById(@PathVariable Long id) {
        return ResponseEntity.ok(service.getAssessmentById(id));
    }

    @PostMapping
    @PreAuthorize("@perm.can('riskManagement', 'CREATE') or hasRole('ADMIN')")
    public ResponseEntity<RiskAssessmentResponse> createAssessment(
            @Valid @RequestBody RiskAssessmentRequest request,
            Authentication authentication) {
        String username = authentication != null ? authentication.getName() : "system";
        return ResponseEntity.status(HttpStatus.CREATED).body(service.createAssessment(request, username));
    }

    @PutMapping("/{id}")
    @PreAuthorize("@perm.can('riskManagement', 'EDIT') or hasRole('ADMIN')")
    public ResponseEntity<RiskAssessmentResponse> updateAssessment(
            @PathVariable Long id,
            @Valid @RequestBody RiskAssessmentRequest request,
            Authentication authentication) {
        String username = authentication != null ? authentication.getName() : "system";
        return ResponseEntity.ok(service.updateAssessment(id, request, username));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("@perm.can('riskManagement', 'DELETE') or hasRole('ADMIN')")
    public ResponseEntity<Void> deleteAssessment(
            @PathVariable Long id,
            Authentication authentication) {
        String username = authentication != null ? authentication.getName() : "system";
        service.deleteAssessment(id, username);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/approve")
    @PreAuthorize("@perm.can('riskManagement', 'EDIT') or hasRole('ADMIN')")
    public ResponseEntity<RiskAssessmentResponse> approveAssessment(
            @PathVariable Long id,
            @RequestParam(required = false) String approver,
            Authentication authentication) {
        String username = authentication != null ? authentication.getName() : "system";
        return ResponseEntity.ok(service.approveAssessment(id, approver, username));
    }

    // =========================================================================
    // 2. 위해요인 및 FMEA 위험 통제 조치 (Hazard Items)
    // =========================================================================

    @GetMapping("/{id}/hazards")
    @PreAuthorize("@perm.can('riskManagement', 'VIEW') or hasAnyRole('ADMIN', 'USER')")
    public ResponseEntity<List<RiskHazardItem>> getHazardItems(@PathVariable Long id) {
        return ResponseEntity.ok(service.getHazardItems(id));
    }

    @PostMapping("/{id}/hazards")
    @PreAuthorize("@perm.can('riskManagement', 'CREATE') or hasRole('ADMIN')")
    public ResponseEntity<RiskHazardItem> addHazardItem(
            @PathVariable Long id,
            @Valid @RequestBody RiskHazardItemRequest request,
            Authentication authentication) {
        String username = authentication != null ? authentication.getName() : "system";
        return ResponseEntity.status(HttpStatus.CREATED).body(service.addHazardItem(id, request, username));
    }

    @PutMapping("/{id}/hazards/{hazardId}")
    @PreAuthorize("@perm.can('riskManagement', 'EDIT') or hasRole('ADMIN')")
    public ResponseEntity<RiskHazardItem> updateHazardItem(
            @PathVariable Long id,
            @PathVariable Long hazardId,
            @Valid @RequestBody RiskHazardItemRequest request,
            Authentication authentication) {
        String username = authentication != null ? authentication.getName() : "system";
        return ResponseEntity.ok(service.updateHazardItem(id, hazardId, request, username));
    }

    @DeleteMapping("/{id}/hazards/{hazardId}")
    @PreAuthorize("@perm.can('riskManagement', 'DELETE') or hasRole('ADMIN')")
    public ResponseEntity<Void> deleteHazardItem(
            @PathVariable Long id,
            @PathVariable Long hazardId,
            Authentication authentication) {
        String username = authentication != null ? authentication.getName() : "system";
        service.deleteHazardItem(id, hazardId, username);
        return ResponseEntity.noContent().build();
    }

    // =========================================================================
    // 3. 종합 KPI 및 FMEA 5x5 매트릭스 지표
    // =========================================================================

    @GetMapping("/kpi")
    @PreAuthorize("@perm.can('riskManagement', 'VIEW') or hasAnyRole('ADMIN', 'USER')")
    public ResponseEntity<RiskKpiResponse> getKpiMetrics() {
        return ResponseEntity.ok(service.getKpiMetrics());
    }
}
