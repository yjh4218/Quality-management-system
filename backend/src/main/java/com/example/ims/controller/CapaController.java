package com.example.ims.controller;

import com.example.ims.dto.*;
import com.example.ims.entity.CapaCategory;
import com.example.ims.entity.CapaRiskLevel;
import com.example.ims.entity.CapaSourceType;
import com.example.ims.entity.CapaStatus;
import com.example.ims.service.CapaService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
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

@RestController
@RequestMapping("/api/capa")
@RequiredArgsConstructor
public class CapaController {

    private final CapaService capaService;

    /**
     * 6대 핵심 KPI 요약 조회
     */
    @GetMapping("/kpis")
    @PreAuthorize("hasAnyRole('ADMIN', 'QUALITY', 'QUALITY_TEAM', 'RESPONSIBLE_SALES', 'USER') or hasAuthority('VIEW_CAPA')")
    public ResponseEntity<CapaKpiResponse> getKpiSummary() {
        return ResponseEntity.ok(capaService.getKpiSummary());
    }

    /**
     * 다차원 검색 및 페이징 목록 조회
     */
    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'QUALITY', 'QUALITY_TEAM', 'RESPONSIBLE_SALES', 'USER') or hasAuthority('VIEW_CAPA')")
    public ResponseEntity<Page<CapaResponse>> searchCapas(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) CapaSourceType sourceType,
            @RequestParam(required = false) CapaStatus status,
            @RequestParam(required = false) CapaCategory category,
            @RequestParam(required = false) CapaRiskLevel riskLevel,
            @RequestParam(required = false) String assignedTo,
            @RequestParam(required = false) Boolean overdueOnly,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        PageRequest pageRequest = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "id"));
        Page<CapaResponse> response = capaService.searchCapas(
                keyword, sourceType, status, category, riskLevel, assignedTo, overdueOnly, startDate, endDate, pageRequest
        );
        return ResponseEntity.ok(response);
    }

    /**
     * 상세 조회
     */
    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'QUALITY', 'QUALITY_TEAM', 'RESPONSIBLE_SALES', 'USER') or hasAuthority('VIEW_CAPA')")
    public ResponseEntity<CapaResponse> getCapaById(@PathVariable Long id) {
        return ResponseEntity.ok(capaService.getCapaById(id));
    }

    /**
     * 신규 CAPA 발의/등록
     */
    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'QUALITY', 'QUALITY_TEAM') or hasAuthority('MANAGE_CAPA')")
    public ResponseEntity<CapaResponse> createCapa(
            @Valid @RequestBody CapaCreateRequest request,
            Authentication auth) {
        String username = (auth != null) ? auth.getName() : "system";
        CapaResponse response = capaService.createCapa(request, username);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * 근본원인 분석 (5-Why & Fishbone) 기록
     */
    @PutMapping("/{id}/root-cause")
    @PreAuthorize("hasAnyRole('ADMIN', 'QUALITY', 'QUALITY_TEAM') or hasAuthority('MANAGE_CAPA')")
    public ResponseEntity<CapaResponse> recordRootCause(
            @PathVariable Long id,
            @Valid @RequestBody CapaRootCauseRequest request,
            Authentication auth) {
        String username = (auth != null) ? auth.getName() : "system";
        return ResponseEntity.ok(capaService.recordRootCause(id, request, username));
    }

    /**
     * 조치과제 추가
     */
    @PostMapping("/{id}/actions")
    @PreAuthorize("hasAnyRole('ADMIN', 'QUALITY', 'QUALITY_TEAM') or hasAuthority('MANAGE_CAPA')")
    public ResponseEntity<CapaActionItemResponse> addActionItem(
            @PathVariable Long id,
            @Valid @RequestBody CapaActionItemRequest request,
            Authentication auth) {
        String username = (auth != null) ? auth.getName() : "system";
        return ResponseEntity.status(HttpStatus.CREATED).body(capaService.addActionItem(id, request, username));
    }

    /**
     * 조치과제 수정
     */
    @PutMapping("/actions/{itemId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'QUALITY', 'QUALITY_TEAM') or hasAuthority('MANAGE_CAPA')")
    public ResponseEntity<CapaActionItemResponse> updateActionItem(
            @PathVariable Long itemId,
            @Valid @RequestBody CapaActionItemRequest request,
            Authentication auth) {
        String username = (auth != null) ? auth.getName() : "system";
        return ResponseEntity.ok(capaService.updateActionItem(itemId, request, username));
    }

    /**
     * 조치과제 완료 검증
     */
    @PutMapping("/actions/{itemId}/verify")
    @PreAuthorize("hasAnyRole('ADMIN', 'QUALITY', 'QUALITY_TEAM') or hasAuthority('MANAGE_CAPA')")
    public ResponseEntity<CapaActionItemResponse> verifyActionItem(
            @PathVariable Long itemId,
            @RequestParam(required = false) String verifiedBy,
            @RequestParam(required = false) String notes,
            Authentication auth) {
        String username = (auth != null) ? auth.getName() : "system";
        return ResponseEntity.ok(capaService.verifyActionItem(itemId, verifiedBy, notes, username));
    }

    /**
     * 조치과제 삭제
     */
    @DeleteMapping("/actions/{itemId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'QUALITY', 'QUALITY_TEAM') or hasAuthority('MANAGE_CAPA')")
    public ResponseEntity<Void> deleteActionItem(@PathVariable Long itemId) {
        capaService.deleteActionItem(itemId);
        return ResponseEntity.noContent().build();
    }

    /**
     * 효과성 검증 (Effectiveness Review) 수행
     */
    @PutMapping("/{id}/effectiveness")
    @PreAuthorize("hasAnyRole('ADMIN', 'QUALITY', 'QUALITY_TEAM') or hasAuthority('MANAGE_CAPA')")
    public ResponseEntity<CapaResponse> evaluateEffectiveness(
            @PathVariable Long id,
            @Valid @RequestBody CapaEffectivenessRequest request,
            Authentication auth) {
        String username = (auth != null) ? auth.getName() : "system";
        return ResponseEntity.ok(capaService.evaluateEffectiveness(id, request, username));
    }

    /**
     * 최종 종결 (Closure)
     */
    @PutMapping("/{id}/close")
    @PreAuthorize("hasAnyRole('ADMIN', 'QUALITY', 'QUALITY_TEAM') or hasAuthority('MANAGE_CAPA')")
    public ResponseEntity<CapaResponse> closeCapa(
            @PathVariable Long id,
            @Valid @RequestBody CapaCloseRequest request,
            Authentication auth) {
        String username = (auth != null) ? auth.getName() : "system";
        return ResponseEntity.ok(capaService.closeCapa(id, request, username));
    }

    /**
     * CAPA 무효화 처리
     */
    @PutMapping("/{id}/void")
    @PreAuthorize("hasAnyRole('ADMIN', 'QUALITY') or hasAuthority('MANAGE_CAPA')")
    public ResponseEntity<CapaResponse> voidCapa(
            @PathVariable Long id,
            @RequestParam String reason,
            Authentication auth) {
        String username = (auth != null) ? auth.getName() : "system";
        return ResponseEntity.ok(capaService.voidCapa(id, reason, username));
    }
}
