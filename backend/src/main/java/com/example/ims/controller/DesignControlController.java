package com.example.ims.controller;

import com.example.ims.dto.*;
import com.example.ims.entity.DesignControlItem;
import com.example.ims.entity.DesignPhase;
import com.example.ims.entity.DesignProjectStatus;
import com.example.ims.entity.DesignReviewRecord;
import com.example.ims.service.DesignControlService;
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
 * 📐 ISO 13485:2016 §7.3 / 21 CFR 820.30 의료기기 설계개발(Design Controls) 및 DHF REST API 컨트롤러
 */
@RestController
@RequestMapping("/api/quality/design-controls")
@RequiredArgsConstructor
public class DesignControlController {

    private final DesignControlService service;

    // =========================================================================
    // 1. 설계 프로젝트 (Projects)
    // =========================================================================

    @GetMapping("/projects")
    @PreAuthorize("@perm.can('designControls', 'VIEW') or hasAnyRole('ADMIN', 'USER')")
    public ResponseEntity<Page<DesignProjectResponse>> getProjects(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) DesignPhase phase,
            @RequestParam(required = false) DesignProjectStatus status,
            @RequestParam(required = false) String dhfStatus,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        return ResponseEntity.ok(service.getProjects(keyword, phase, status, dhfStatus, page, size));
    }

    @GetMapping("/projects/{id}")
    @PreAuthorize("@perm.can('designControls', 'VIEW') or hasAnyRole('ADMIN', 'USER')")
    public ResponseEntity<DesignProjectResponse> getProjectById(@PathVariable Long id) {
        return ResponseEntity.ok(service.getProjectById(id));
    }

    @PostMapping("/projects")
    @PreAuthorize("@perm.can('designControls', 'CREATE') or hasRole('ADMIN')")
    public ResponseEntity<DesignProjectResponse> createProject(
            @Valid @RequestBody DesignProjectRequest request,
            Authentication authentication) {
        String username = authentication != null ? authentication.getName() : "system";
        return ResponseEntity.status(HttpStatus.CREATED).body(service.createProject(request, username));
    }

    @PutMapping("/projects/{id}")
    @PreAuthorize("@perm.can('designControls', 'EDIT') or hasRole('ADMIN')")
    public ResponseEntity<DesignProjectResponse> updateProject(
            @PathVariable Long id,
            @Valid @RequestBody DesignProjectRequest request,
            Authentication authentication) {
        String username = authentication != null ? authentication.getName() : "system";
        return ResponseEntity.ok(service.updateProject(id, request, username));
    }

    @DeleteMapping("/projects/{id}")
    @PreAuthorize("@perm.can('designControls', 'DELETE') or hasRole('ADMIN')")
    public ResponseEntity<Void> deleteProject(
            @PathVariable Long id,
            Authentication authentication) {
        String username = authentication != null ? authentication.getName() : "system";
        service.deleteProject(id, username);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/projects/{id}/phase")
    @PreAuthorize("@perm.can('designControls', 'EDIT') or hasRole('ADMIN')")
    public ResponseEntity<DesignProjectResponse> advancePhase(
            @PathVariable Long id,
            @RequestParam DesignPhase nextPhase,
            Authentication authentication) {
        String username = authentication != null ? authentication.getName() : "system";
        return ResponseEntity.ok(service.advancePhase(id, nextPhase, username));
    }

    @PostMapping("/projects/{id}/dhf-status")
    @PreAuthorize("@perm.can('designControls', 'EDIT') or hasRole('ADMIN')")
    public ResponseEntity<DesignProjectResponse> updateDhfStatus(
            @PathVariable Long id,
            @RequestParam String dhfStatus,
            Authentication authentication) {
        String username = authentication != null ? authentication.getName() : "system";
        return ResponseEntity.ok(service.updateDhfStatus(id, dhfStatus, username));
    }

    // =========================================================================
    // 2. 설계통제 항목 및 추적성 (Items)
    // =========================================================================

    @GetMapping("/projects/{projectId}/items")
    @PreAuthorize("@perm.can('designControls', 'VIEW') or hasAnyRole('ADMIN', 'USER')")
    public ResponseEntity<List<DesignControlItem>> getControlItems(@PathVariable Long projectId) {
        return ResponseEntity.ok(service.getControlItems(projectId));
    }

    @PostMapping("/projects/{projectId}/items")
    @PreAuthorize("@perm.can('designControls', 'CREATE') or hasRole('ADMIN')")
    public ResponseEntity<DesignControlItem> addControlItem(
            @PathVariable Long projectId,
            @Valid @RequestBody DesignControlItemRequest request,
            Authentication authentication) {
        String username = authentication != null ? authentication.getName() : "system";
        return ResponseEntity.status(HttpStatus.CREATED).body(service.addControlItem(projectId, request, username));
    }

    @PutMapping("/projects/{projectId}/items/{itemId}")
    @PreAuthorize("@perm.can('designControls', 'EDIT') or hasRole('ADMIN')")
    public ResponseEntity<DesignControlItem> updateControlItem(
            @PathVariable Long projectId,
            @PathVariable Long itemId,
            @Valid @RequestBody DesignControlItemRequest request,
            Authentication authentication) {
        String username = authentication != null ? authentication.getName() : "system";
        return ResponseEntity.ok(service.updateControlItem(projectId, itemId, request, username));
    }

    @DeleteMapping("/projects/{projectId}/items/{itemId}")
    @PreAuthorize("@perm.can('designControls', 'DELETE') or hasRole('ADMIN')")
    public ResponseEntity<Void> deleteControlItem(
            @PathVariable Long projectId,
            @PathVariable Long itemId,
            Authentication authentication) {
        String username = authentication != null ? authentication.getName() : "system";
        service.deleteControlItem(projectId, itemId, username);
        return ResponseEntity.noContent().build();
    }

    // =========================================================================
    // 3. 설계 심의 및 단계 게이트 (Reviews)
    // =========================================================================

    @GetMapping("/projects/{projectId}/reviews")
    @PreAuthorize("@perm.can('designControls', 'VIEW') or hasAnyRole('ADMIN', 'USER')")
    public ResponseEntity<List<DesignReviewRecord>> getReviewRecords(@PathVariable Long projectId) {
        return ResponseEntity.ok(service.getReviewRecords(projectId));
    }

    @PostMapping("/projects/{projectId}/reviews")
    @PreAuthorize("@perm.can('designControls', 'CREATE') or hasRole('ADMIN')")
    public ResponseEntity<DesignReviewRecord> addReviewRecord(
            @PathVariable Long projectId,
            @Valid @RequestBody DesignReviewRecordRequest request,
            Authentication authentication) {
        String username = authentication != null ? authentication.getName() : "system";
        return ResponseEntity.status(HttpStatus.CREATED).body(service.addReviewRecord(projectId, request, username));
    }

    @PutMapping("/projects/{projectId}/reviews/{recordId}")
    @PreAuthorize("@perm.can('designControls', 'EDIT') or hasRole('ADMIN')")
    public ResponseEntity<DesignReviewRecord> updateReviewRecord(
            @PathVariable Long projectId,
            @PathVariable Long recordId,
            @Valid @RequestBody DesignReviewRecordRequest request,
            Authentication authentication) {
        String username = authentication != null ? authentication.getName() : "system";
        return ResponseEntity.ok(service.updateReviewRecord(projectId, recordId, request, username));
    }

    @DeleteMapping("/projects/{projectId}/reviews/{recordId}")
    @PreAuthorize("@perm.can('designControls', 'DELETE') or hasRole('ADMIN')")
    public ResponseEntity<Void> deleteReviewRecord(
            @PathVariable Long projectId,
            @PathVariable Long recordId,
            Authentication authentication) {
        String username = authentication != null ? authentication.getName() : "system";
        service.deleteReviewRecord(projectId, recordId, username);
        return ResponseEntity.noContent().build();
    }

    // =========================================================================
    // 4. 요구사항 추적성 매트릭스 (RTM) & KPI
    // =========================================================================

    @GetMapping("/projects/{projectId}/traceability-matrix")
    @PreAuthorize("@perm.can('designControls', 'VIEW') or hasAnyRole('ADMIN', 'USER')")
    public ResponseEntity<List<DesignTraceabilityMatrixDto>> getTraceabilityMatrix(@PathVariable Long projectId) {
        return ResponseEntity.ok(service.getTraceabilityMatrix(projectId));
    }

    @GetMapping("/kpi")
    @PreAuthorize("@perm.can('designControls', 'VIEW') or hasAnyRole('ADMIN', 'USER')")
    public ResponseEntity<DesignKpiResponse> getDesignKpis() {
        return ResponseEntity.ok(service.getDesignKpis());
    }
}
