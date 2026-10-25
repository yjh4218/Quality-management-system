package com.example.ims.controller;

import com.example.ims.dto.*;
import com.example.ims.entity.*;
import com.example.ims.service.SupplierManagementService;
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
 * 🏭 공급업체 및 위탁제조 관리 REST Controller
 * ISO 13485:2016 §4.1.5, §7.4 / ISO 22716:2007 §12 / 21 CFR 820.50
 */
@RestController
@RequestMapping("/api/quality/suppliers")
@RequiredArgsConstructor
public class SupplierManagementController {

    private final SupplierManagementService service;

    // =========================================================================
    // 1. 공급업체 품질 적격성 마스터 (ASL)
    // =========================================================================

    @GetMapping("/qualifications")
    @PreAuthorize("@perm.can('supplierManagement', 'VIEW') or hasAnyRole('ADMIN', 'USER')")
    public ResponseEntity<Page<SupplierQualificationResponse>> searchQualifications(
            @RequestParam(required = false) SupplierApprovalStatus status,
            @RequestParam(required = false) SupplierGrade grade,
            @RequestParam(required = false) SupplierType type,
            @RequestParam(required = false) String keyword,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "15") int size) {
        Pageable pageable = PageRequest.of(page, size);
        return ResponseEntity.ok(service.searchQualifications(status, grade, type, keyword, pageable));
    }

    @GetMapping("/qualifications/{id}")
    @PreAuthorize("@perm.can('supplierManagement', 'VIEW') or hasAnyRole('ADMIN', 'USER')")
    public ResponseEntity<SupplierQualificationResponse> getQualificationById(@PathVariable Long id) {
        return ResponseEntity.ok(service.getQualificationById(id));
    }

    @PostMapping("/qualifications")
    @PreAuthorize("@perm.can('supplierManagement', 'CREATE') or hasRole('ADMIN')")
    public ResponseEntity<SupplierQualificationResponse> createQualification(
            @Valid @RequestBody SupplierQualificationRequest request,
            Authentication authentication) {
        String username = authentication != null ? authentication.getName() : "system";
        return ResponseEntity.status(HttpStatus.CREATED).body(service.createQualification(request, username));
    }

    @PutMapping("/qualifications/{id}")
    @PreAuthorize("@perm.can('supplierManagement', 'EDIT') or hasRole('ADMIN')")
    public ResponseEntity<SupplierQualificationResponse> updateQualification(
            @PathVariable Long id,
            @Valid @RequestBody SupplierQualificationRequest request,
            Authentication authentication) {
        String username = authentication != null ? authentication.getName() : "system";
        return ResponseEntity.ok(service.updateQualification(id, request, username));
    }

    @DeleteMapping("/qualifications/{id}")
    @PreAuthorize("@perm.can('supplierManagement', 'DELETE') or hasRole('ADMIN')")
    public ResponseEntity<Void> deleteQualification(
            @PathVariable Long id,
            Authentication authentication) {
        String username = authentication != null ? authentication.getName() : "system";
        service.deleteQualification(id, username);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/qualifications/{id}/status")
    @PreAuthorize("@perm.can('supplierManagement', 'EDIT') or hasRole('ADMIN')")
    public ResponseEntity<SupplierQualificationResponse> transitionStatus(
            @PathVariable Long id,
            @RequestParam SupplierApprovalStatus status,
            @RequestParam(required = false) String approvedBy,
            Authentication authentication) {
        String username = authentication != null ? authentication.getName() : "system";
        return ResponseEntity.ok(service.transitionStatus(id, status, approvedBy, username));
    }

    // =========================================================================
    // 2. 공급업체 정기 종합평가 (Supplier Performance Evaluations)
    // =========================================================================

    @GetMapping("/evaluations")
    @PreAuthorize("@perm.can('supplierManagement', 'VIEW') or hasAnyRole('ADMIN', 'USER')")
    public ResponseEntity<Page<SupplierEvaluationResponse>> searchEvaluations(
            @RequestParam(required = false) Long qualificationId,
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) EvaluationPeriod period,
            @RequestParam(required = false) SupplierGrade grade,
            @RequestParam(required = false) String keyword,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "15") int size) {
        Pageable pageable = PageRequest.of(page, size);
        return ResponseEntity.ok(service.searchEvaluations(qualificationId, year, period, grade, keyword, pageable));
    }

    @GetMapping("/qualifications/{id}/evaluations")
    @PreAuthorize("@perm.can('supplierManagement', 'VIEW') or hasAnyRole('ADMIN', 'USER')")
    public ResponseEntity<List<SupplierEvaluationResponse>> getEvaluationsByQualificationId(@PathVariable Long id) {
        return ResponseEntity.ok(service.getEvaluationsByQualificationId(id));
    }

    @PostMapping("/evaluations")
    @PreAuthorize("@perm.can('supplierManagement', 'CREATE') or hasRole('ADMIN')")
    public ResponseEntity<SupplierEvaluationResponse> createEvaluation(
            @Valid @RequestBody SupplierEvaluationRequest request,
            Authentication authentication) {
        String username = authentication != null ? authentication.getName() : "system";
        return ResponseEntity.status(HttpStatus.CREATED).body(service.createEvaluation(request, username));
    }

    @PutMapping("/evaluations/{id}")
    @PreAuthorize("@perm.can('supplierManagement', 'EDIT') or hasRole('ADMIN')")
    public ResponseEntity<SupplierEvaluationResponse> updateEvaluation(
            @PathVariable Long id,
            @Valid @RequestBody SupplierEvaluationRequest request,
            Authentication authentication) {
        String username = authentication != null ? authentication.getName() : "system";
        return ResponseEntity.ok(service.updateEvaluation(id, request, username));
    }

    @DeleteMapping("/evaluations/{id}")
    @PreAuthorize("@perm.can('supplierManagement', 'DELETE') or hasRole('ADMIN')")
    public ResponseEntity<Void> deleteEvaluation(
            @PathVariable Long id,
            Authentication authentication) {
        String username = authentication != null ? authentication.getName() : "system";
        service.deleteEvaluation(id, username);
        return ResponseEntity.noContent().build();
    }

    // =========================================================================
    // 3. 품질협약서 (Quality Assurance Agreement - QAA)
    // =========================================================================

    @GetMapping("/agreements")
    @PreAuthorize("@perm.can('supplierManagement', 'VIEW') or hasAnyRole('ADMIN', 'USER')")
    public ResponseEntity<Page<QualityAgreementResponse>> searchAgreements(
            @RequestParam(required = false) AgreementStatus status,
            @RequestParam(required = false) AgreementType type,
            @RequestParam(required = false) String keyword,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "15") int size) {
        Pageable pageable = PageRequest.of(page, size);
        return ResponseEntity.ok(service.searchAgreements(status, type, keyword, pageable));
    }

    @GetMapping("/agreements/{id}")
    @PreAuthorize("@perm.can('supplierManagement', 'VIEW') or hasAnyRole('ADMIN', 'USER')")
    public ResponseEntity<QualityAgreementResponse> getAgreementById(@PathVariable Long id) {
        return ResponseEntity.ok(service.getAgreementById(id));
    }

    @PostMapping("/agreements")
    @PreAuthorize("@perm.can('supplierManagement', 'CREATE') or hasRole('ADMIN')")
    public ResponseEntity<QualityAgreementResponse> createAgreement(
            @Valid @RequestBody QualityAgreementRequest request,
            Authentication authentication) {
        String username = authentication != null ? authentication.getName() : "system";
        return ResponseEntity.status(HttpStatus.CREATED).body(service.createAgreement(request, username));
    }

    @PutMapping("/agreements/{id}")
    @PreAuthorize("@perm.can('supplierManagement', 'EDIT') or hasRole('ADMIN')")
    public ResponseEntity<QualityAgreementResponse> updateAgreement(
            @PathVariable Long id,
            @Valid @RequestBody QualityAgreementRequest request,
            Authentication authentication) {
        String username = authentication != null ? authentication.getName() : "system";
        return ResponseEntity.ok(service.updateAgreement(id, request, username));
    }

    @DeleteMapping("/agreements/{id}")
    @PreAuthorize("@perm.can('supplierManagement', 'DELETE') or hasRole('ADMIN')")
    public ResponseEntity<Void> deleteAgreement(
            @PathVariable Long id,
            Authentication authentication) {
        String username = authentication != null ? authentication.getName() : "system";
        service.deleteAgreement(id, username);
        return ResponseEntity.noContent().build();
    }

    // =========================================================================
    // 4. 공급업체 관리 6대 핵심 KPI 통계 단일 쿼리 집계
    // =========================================================================

    @GetMapping("/kpi")
    @PreAuthorize("@perm.can('supplierManagement', 'VIEW') or hasAnyRole('ADMIN', 'USER')")
    public ResponseEntity<SupplierKpiResponse> getSupplierKpis() {
        return ResponseEntity.ok(service.getSupplierKpis());
    }
}
