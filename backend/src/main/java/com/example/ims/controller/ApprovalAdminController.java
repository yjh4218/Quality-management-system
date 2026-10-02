package com.example.ims.controller;

import com.example.ims.dto.ApprovalDocTypeDto;
import com.example.ims.dto.ApprovalTemplateDto;
import com.example.ims.dto.NotificationRuleDto;
import com.example.ims.service.ApprovalAdminService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;
import java.util.Map;

@RestController
@RequiredArgsConstructor
@Slf4j
@PreAuthorize("!hasRole('MANUFACTURER')")
public class ApprovalAdminController {

    private final ApprovalAdminService adminService;

    // ═══════════════════════════════════════════
    // 1. Doc Types
    // ═══════════════════════════════════════════

    /**
     * 일반 사용자용 활성 결재 문서유형 목록 (상신 시 선택용)
     */
    @GetMapping("/api/approval-doc-types")
    public ResponseEntity<List<ApprovalDocTypeDto>> getActiveDocTypes() {
        return ResponseEntity.ok(adminService.getDocTypes(true));
    }

    /**
     * 관리자용 결재 문서유형 전체 목록
     */
    @GetMapping("/api/admin/approval-doc-types")
    public ResponseEntity<List<ApprovalDocTypeDto>> getAllDocTypes() {
        return ResponseEntity.ok(adminService.getDocTypes(false));
    }

    @PostMapping("/api/admin/approval-doc-types")
    public ResponseEntity<ApprovalDocTypeDto> createDocType(
            @RequestBody ApprovalDocTypeDto dto, Principal principal) {
        return ResponseEntity.ok(adminService.saveDocType(dto, principal.getName()));
    }

    @PutMapping("/api/admin/approval-doc-types/{id}")
    public ResponseEntity<ApprovalDocTypeDto> updateDocType(
            @PathVariable Long id, @RequestBody ApprovalDocTypeDto dto, Principal principal) {
        dto.setId(id);
        return ResponseEntity.ok(adminService.saveDocType(dto, principal.getName()));
    }

    // ═══════════════════════════════════════════
    // 2. Templates
    // ═══════════════════════════════════════════

    /**
     * 특정 문서유형의 현재 활성 결재선 템플릿 조회 (일반 사용자 상신 폼 및 관리자 조회 공통)
     */
    @GetMapping({"/api/approval-templates/{docTypeCode}", "/api/admin/approval-templates/code/{docTypeCode}"})
    public ResponseEntity<ApprovalTemplateDto> getCurrentTemplateByCode(@PathVariable String docTypeCode) {
        ApprovalTemplateDto tpl = adminService.getCurrentTemplate(docTypeCode);
        return tpl != null ? ResponseEntity.ok(tpl) : ResponseEntity.noContent().build();
    }

    @GetMapping("/api/admin/approval-templates/{docTypeId}")
    public ResponseEntity<ApprovalTemplateDto> getCurrentTemplateByDocTypeId(@PathVariable Long docTypeId) {
        ApprovalTemplateDto tpl = adminService.getCurrentTemplateByDocTypeId(docTypeId);
        return tpl != null ? ResponseEntity.ok(tpl) : ResponseEntity.noContent().build();
    }

    @GetMapping("/api/admin/approval-templates/{docTypeId}/history")
    public ResponseEntity<List<ApprovalTemplateDto>> getTemplateHistory(@PathVariable Long docTypeId) {
        return ResponseEntity.ok(adminService.getTemplateHistory(docTypeId));
    }

    @PostMapping("/api/admin/approval-templates")
    public ResponseEntity<ApprovalTemplateDto> saveTemplate(
            @RequestBody ApprovalTemplateDto dto, Principal principal) {
        return ResponseEntity.ok(adminService.saveTemplate(dto, principal.getName()));
    }

    // ═══════════════════════════════════════════
    // 3. Notification Rules
    // ═══════════════════════════════════════════

    @GetMapping("/api/admin/notification-rules")
    public ResponseEntity<List<NotificationRuleDto>> getNotificationRules() {
        return ResponseEntity.ok(adminService.getNotificationRules());
    }

    @PutMapping("/api/admin/notification-rules/{id}")
    public ResponseEntity<NotificationRuleDto> updateNotificationRule(
            @PathVariable Long id,
            @RequestBody Map<String, Boolean> body,
            Principal principal) {
        Boolean isActive = body.getOrDefault("isActive", true);
        return ResponseEntity.ok(adminService.updateNotificationRule(id, isActive, principal.getName()));
    }
}
