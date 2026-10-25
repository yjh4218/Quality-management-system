package com.example.ims.controller;

import com.example.ims.dto.*;
import com.example.ims.entity.*;
import com.example.ims.service.ComplaintSafetyService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

/**
 * 고객 불만 및 시판 후 이상사례 평가 REST API 컨트롤러
 * ISO 13485:2016 §8.2.2 / ISO 22716:2007 §10 / 21 CFR 820.198
 * Defect Resolution: D-9 해소 (LOT 미상 접수 허용 및 안전성 평가 연계)
 */
@RestController
@RequestMapping("/api/complaints/safety")
@RequiredArgsConstructor
@Slf4j
public class ComplaintSafetyController {

    private final ComplaintSafetyService safetyService;

    /**
     * 6개 핵심 KPI 요약 조회
     */
    @GetMapping("/kpis")
    @PreAuthorize("hasAnyRole('ADMIN', 'QUALITY', 'QUALITY_TEAM', 'RESPONSIBLE_SALES', 'USER') or hasAuthority('VIEW_COMPLAINT_SAFETY')")
    public ResponseEntity<ComplaintSafetyKpiResponse> getKpis() {
        return ResponseEntity.ok(safetyService.getKpiSummary());
    }

    /**
     * 다차원 검색 및 페이징 목록 조회
     */
    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'QUALITY', 'QUALITY_TEAM', 'RESPONSIBLE_SALES', 'USER') or hasAuthority('VIEW_COMPLAINT_SAFETY')")
    public ResponseEntity<Page<ComplaintSafetyResponse>> searchEvaluations(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) ProductRegulatoryType productType,
            @RequestParam(required = false) Boolean isSerious,
            @RequestParam(required = false) CausalityGrade causalityGrade,
            @RequestParam(required = false) ReportabilityStatus reportabilityStatus,
            @RequestParam(required = false) Boolean isLotUnknown,
            @RequestParam(required = false) ComplaintEvaluationStatus evaluationStatus,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        PageRequest pageRequest = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "id"));
        return ResponseEntity.ok(safetyService.searchEvaluations(
                keyword, productType, isSerious, causalityGrade, reportabilityStatus,
                isLotUnknown, evaluationStatus, startDate, endDate, pageRequest));
    }

    /**
     * 단건 상세 조회
     */
    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'QUALITY', 'QUALITY_TEAM', 'RESPONSIBLE_SALES', 'USER') or hasAuthority('VIEW_COMPLAINT_SAFETY')")
    public ResponseEntity<ComplaintSafetyResponse> getEvaluation(@PathVariable Long id) {
        return ResponseEntity.ok(safetyService.getEvaluationById(id));
    }

    /**
     * 신규 불만 및 이상사례 등록 (D-9 LOT 미상 지원)
     */
    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'QUALITY', 'QUALITY_TEAM') or hasAuthority('MANAGE_COMPLAINT_SAFETY')")
    public ResponseEntity<ComplaintSafetyResponse> createEvaluation(
            @Valid @RequestBody ComplaintSafetyCreateRequest req,
            Authentication auth) {
        String username = auth != null ? auth.getName() : "system";
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(safetyService.createEvaluation(req, username));
    }

    /**
     * 기존 클레임으로부터 안전성 평가 원클릭 연동 생성
     */
    @PostMapping("/from-claim/{claimId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'QUALITY', 'QUALITY_TEAM') or hasAuthority('MANAGE_COMPLAINT_SAFETY')")
    public ResponseEntity<ComplaintSafetyResponse> createFromClaim(
            @PathVariable Long claimId,
            Authentication auth) {
        String username = auth != null ? auth.getName() : "system";
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(safetyService.createFromClaim(claimId, username));
    }

    /**
     * WHO-UMC 인과관계 평가 및 심의 의결
     */
    @PutMapping("/{id}/causality")
    @PreAuthorize("hasAnyRole('ADMIN', 'QUALITY', 'QUALITY_TEAM') or hasAuthority('MANAGE_COMPLAINT_SAFETY')")
    public ResponseEntity<ComplaintSafetyResponse> evaluateCausality(
            @PathVariable Long id,
            @Valid @RequestBody ComplaintCausalityEvaluationRequest req,
            Authentication auth) {
        String username = auth != null ? auth.getName() : "system";
        return ResponseEntity.ok(safetyService.evaluateCausality(id, req, username));
    }

    /**
     * 식약처 / FDA MDR 규제기관 보고 결과 등록
     */
    @PutMapping("/{id}/regulatory-report")
    @PreAuthorize("hasAnyRole('ADMIN', 'QUALITY', 'QUALITY_TEAM') or hasAuthority('MANAGE_COMPLAINT_SAFETY')")
    public ResponseEntity<ComplaintSafetyResponse> submitRegulatoryReport(
            @PathVariable Long id,
            @Valid @RequestBody ComplaintRegulatoryReportRequest req,
            Authentication auth) {
        String username = auth != null ? auth.getName() : "system";
        return ResponseEntity.ok(safetyService.submitRegulatoryReport(id, req, username));
    }

    /**
     * 원인조사 결과 및 16단계 CAPA 연계 등록
     */
    @PutMapping("/{id}/investigation")
    @PreAuthorize("hasAnyRole('ADMIN', 'QUALITY', 'QUALITY_TEAM') or hasAuthority('MANAGE_COMPLAINT_SAFETY')")
    public ResponseEntity<ComplaintSafetyResponse> recordInvestigation(
            @PathVariable Long id,
            @Valid @RequestBody ComplaintInvestigationRequest req,
            Authentication auth) {
        String username = auth != null ? auth.getName() : "system";
        return ResponseEntity.ok(safetyService.recordInvestigation(id, req, username));
    }

    /**
     * 최종 종결 처리
     */
    @PutMapping("/{id}/close")
    @PreAuthorize("hasAnyRole('ADMIN', 'QUALITY', 'QUALITY_TEAM') or hasAuthority('MANAGE_COMPLAINT_SAFETY')")
    public ResponseEntity<ComplaintSafetyResponse> closeEvaluation(
            @PathVariable Long id,
            @Valid @RequestBody ComplaintCloseRequest req,
            Authentication auth) {
        String username = auth != null ? auth.getName() : "system";
        return ResponseEntity.ok(safetyService.closeEvaluation(id, req, username));
    }

    /**
     * 후속 조치과제 등록
     */
    @PostMapping("/{id}/actions")
    @PreAuthorize("hasAnyRole('ADMIN', 'QUALITY', 'QUALITY_TEAM') or hasAuthority('MANAGE_COMPLAINT_SAFETY')")
    public ResponseEntity<ComplaintActionItemResponse> addActionItem(
            @PathVariable Long id,
            @Valid @RequestBody ComplaintActionItemRequest req,
            Authentication auth) {
        String username = auth != null ? auth.getName() : "system";
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(safetyService.addActionItem(id, req, username));
    }

    /**
     * 후속 조치과제 수정 및 완료
     */
    @PutMapping("/actions/{itemId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'QUALITY', 'QUALITY_TEAM') or hasAuthority('MANAGE_COMPLAINT_SAFETY')")
    public ResponseEntity<ComplaintActionItemResponse> updateActionItem(
            @PathVariable Long itemId,
            @Valid @RequestBody ComplaintActionItemRequest req,
            Authentication auth) {
        String username = auth != null ? auth.getName() : "system";
        return ResponseEntity.ok(safetyService.updateActionItem(itemId, req, username));
    }

    /**
     * 후속 조치과제 검증 판정
     */
    @PutMapping("/actions/{itemId}/verify")
    @PreAuthorize("hasAnyRole('ADMIN', 'QUALITY', 'QUALITY_TEAM') or hasAuthority('MANAGE_COMPLAINT_SAFETY')")
    public ResponseEntity<ComplaintActionItemResponse> verifyActionItem(
            @PathVariable Long itemId,
            @RequestParam String verifiedBy,
            @RequestParam VerificationResult result,
            Authentication auth) {
        String username = auth != null ? auth.getName() : "system";
        return ResponseEntity.ok(safetyService.verifyActionItem(itemId, verifiedBy, result, username));
    }

    /**
     * 후속 조치과제 삭제
     */
    @DeleteMapping("/actions/{itemId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'QUALITY', 'QUALITY_TEAM') or hasAuthority('MANAGE_COMPLAINT_SAFETY')")
    public ResponseEntity<Void> deleteActionItem(@PathVariable Long itemId) {
        safetyService.deleteActionItem(itemId);
        return ResponseEntity.noContent().build();
    }
}
