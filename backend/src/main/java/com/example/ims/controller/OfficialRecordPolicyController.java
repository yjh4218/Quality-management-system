package com.example.ims.controller;

import com.example.ims.dto.*;
import com.example.ims.service.OfficialRecordPolicyService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/official-records")
@RequiredArgsConstructor
@Slf4j
public class OfficialRecordPolicyController {

    private final OfficialRecordPolicyService policyService;

    // =========================================================================
    // 0. KPI 지표 요약
    // =========================================================================

    @GetMapping("/kpi")
    @PreAuthorize("hasAnyRole('ADMIN', 'QUALITY', 'QUALITY_TEAM', 'RESPONSIBLE_SALES', 'USER') or hasAuthority('POLICY_VIEW')")
    public ResponseEntity<OfficialRecordsKpiResponse> getKpi() {
        return ResponseEntity.ok(policyService.getKpi());
    }

    // =========================================================================
    // 1. 21 CFR Part 11 전자서명 & 감사대장
    // =========================================================================

    @PostMapping("/signatures")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ElectronicSignatureResponse> createSignature(
            @Valid @RequestBody ElectronicSignatureRequest req,
            Authentication authentication,
            HttpServletRequest request) {

        String username = authentication != null ? authentication.getName() : "admin";
        String clientIp = extractClientIp(request);
        String userAgent = request.getHeader("User-Agent");

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(policyService.createSignature(req, username, clientIp, userAgent));
    }

    @GetMapping("/signatures")
    @PreAuthorize("hasAnyRole('ADMIN', 'QUALITY', 'QUALITY_TEAM', 'RESPONSIBLE_SALES', 'USER') or hasAuthority('POLICY_VIEW')")
    public ResponseEntity<List<ElectronicSignatureResponse>> getAllSignatures() {
        return ResponseEntity.ok(policyService.getAllSignatures());
    }

    @GetMapping("/signatures/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'QUALITY', 'QUALITY_TEAM', 'RESPONSIBLE_SALES', 'USER') or hasAuthority('POLICY_VIEW')")
    public ResponseEntity<ElectronicSignatureResponse> getSignatureById(@PathVariable Long id) {
        return ResponseEntity.ok(policyService.getSignatureById(id));
    }

    @GetMapping("/signatures/by-target")
    @PreAuthorize("hasAnyRole('ADMIN', 'QUALITY', 'QUALITY_TEAM', 'RESPONSIBLE_SALES', 'USER') or hasAuthority('POLICY_VIEW')")
    public ResponseEntity<List<ElectronicSignatureResponse>> getSignaturesByTarget(
            @RequestParam String documentType,
            @RequestParam Long targetId) {
        return ResponseEntity.ok(policyService.getSignaturesByTarget(documentType, targetId));
    }

    @PostMapping("/signatures/{id}/revoke")
    @PreAuthorize("hasAnyRole('ADMIN', 'QUALITY', 'QUALITY_TEAM', 'RESPONSIBLE_SALES') or hasAuthority('POLICY_MANAGE')")
    public ResponseEntity<ElectronicSignatureResponse> revokeSignature(
            @PathVariable Long id,
            @RequestBody Map<String, String> body,
            Authentication authentication) {
        String username = authentication != null ? authentication.getName() : "admin";
        String reason = body.getOrDefault("reason", "관리자 서명 철회");
        return ResponseEntity.ok(policyService.revokeSignature(id, reason, username));
    }

    // =========================================================================
    // 2. 21 CFR Part 11 적합성 자가평가 항목
    // =========================================================================

    @GetMapping("/part11-assessments")
    @PreAuthorize("hasAnyRole('ADMIN', 'QUALITY', 'QUALITY_TEAM', 'RESPONSIBLE_SALES', 'USER') or hasAuthority('POLICY_VIEW')")
    public ResponseEntity<List<Part11AssessmentItemResponse>> getAllPart11Assessments() {
        return ResponseEntity.ok(policyService.getAllPart11Assessments());
    }

    @PostMapping("/part11-assessments")
    @PreAuthorize("hasAnyRole('ADMIN', 'QUALITY', 'QUALITY_TEAM', 'RESPONSIBLE_SALES') or hasAuthority('POLICY_MANAGE')")
    public ResponseEntity<Part11AssessmentItemResponse> createPart11Assessment(
            @Valid @RequestBody Part11AssessmentItemRequest req,
            Authentication authentication) {
        String username = authentication != null ? authentication.getName() : "admin";
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(policyService.createPart11Assessment(req, username));
    }

    @PutMapping("/part11-assessments/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'QUALITY', 'QUALITY_TEAM', 'RESPONSIBLE_SALES') or hasAuthority('POLICY_MANAGE')")
    public ResponseEntity<Part11AssessmentItemResponse> updatePart11Assessment(
            @PathVariable Long id,
            @Valid @RequestBody Part11AssessmentItemRequest req,
            Authentication authentication) {
        String username = authentication != null ? authentication.getName() : "admin";
        return ResponseEntity.ok(policyService.updatePart11Assessment(id, req, username));
    }

    @DeleteMapping("/part11-assessments/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'QUALITY', 'QUALITY_TEAM', 'RESPONSIBLE_SALES') or hasAuthority('POLICY_MANAGE')")
    public ResponseEntity<Map<String, String>> deletePart11Assessment(@PathVariable Long id) {
        policyService.deletePart11Assessment(id);
        return ResponseEntity.ok(Map.of("message", "평가 항목이 삭제되었습니다.", "id", id.toString()));
    }

    // =========================================================================
    // 3. 공식 원본 및 보존 정책 (DEC-01)
    // =========================================================================

    @GetMapping("/policies")
    @PreAuthorize("hasAnyRole('ADMIN', 'QUALITY', 'QUALITY_TEAM', 'RESPONSIBLE_SALES', 'USER') or hasAuthority('POLICY_VIEW')")
    public ResponseEntity<List<OfficialRecordPolicyResponse>> getAllPolicies() {
        return ResponseEntity.ok(policyService.getAllPolicies());
    }

    @PostMapping("/policies")
    @PreAuthorize("hasAnyRole('ADMIN', 'QUALITY', 'QUALITY_TEAM', 'RESPONSIBLE_SALES') or hasAuthority('POLICY_MANAGE')")
    public ResponseEntity<OfficialRecordPolicyResponse> createPolicy(
            @Valid @RequestBody OfficialRecordPolicyRequest req,
            Authentication authentication) {
        String username = authentication != null ? authentication.getName() : "admin";
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(policyService.createPolicy(req, username));
    }

    @PutMapping("/policies/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'QUALITY', 'QUALITY_TEAM', 'RESPONSIBLE_SALES') or hasAuthority('POLICY_MANAGE')")
    public ResponseEntity<OfficialRecordPolicyResponse> updatePolicy(
            @PathVariable Long id,
            @Valid @RequestBody OfficialRecordPolicyRequest req,
            Authentication authentication) {
        String username = authentication != null ? authentication.getName() : "admin";
        return ResponseEntity.ok(policyService.updatePolicy(id, req, username));
    }

    @DeleteMapping("/policies/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'QUALITY', 'QUALITY_TEAM', 'RESPONSIBLE_SALES') or hasAuthority('POLICY_MANAGE')")
    public ResponseEntity<Map<String, String>> deletePolicy(@PathVariable Long id) {
        policyService.deletePolicy(id);
        return ResponseEntity.ok(Map.of("message", "공식 원본 정책이 삭제되었습니다.", "id", id.toString()));
    }

    // =========================================================================
    // Helper
    // =========================================================================

    private String extractClientIp(HttpServletRequest request) {
        String xf = request.getHeader("X-Forwarded-For");
        if (xf != null && !xf.isBlank()) {
            return xf.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
