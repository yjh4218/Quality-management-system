package com.example.ims.controller;

import com.example.ims.dto.*;
import com.example.ims.entity.ChangeCategory;
import com.example.ims.entity.ChangeStatus;
import com.example.ims.entity.ChangeUrgency;
import com.example.ims.service.ChangeControlService;
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
 * 🔄 변경관리 (Change Control) REST API 컨트롤러
 * ISO 13485:2016 §7.3.9 / ISO 22716:2007 §11 / 21 CFR 820.70
 */
@RestController
@RequestMapping("/api/quality/change-controls")
@RequiredArgsConstructor
public class ChangeControlController {

    private final ChangeControlService service;

    // =========================================================================
    // 1. 변경요청서 (Change Requests)
    // =========================================================================

    @GetMapping("/requests")
    @PreAuthorize("@perm.can('changeControl', 'VIEW') or hasAnyRole('ADMIN', 'USER')")
    public ResponseEntity<Page<ChangeRequestResponse>> getChangeRequests(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) ChangeCategory category,
            @RequestParam(required = false) ChangeUrgency urgency,
            @RequestParam(required = false) ChangeStatus status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        return ResponseEntity.ok(service.getChangeRequests(keyword, category, urgency, status, page, size));
    }

    @GetMapping("/requests/{id}")
    @PreAuthorize("@perm.can('changeControl', 'VIEW') or hasAnyRole('ADMIN', 'USER')")
    public ResponseEntity<ChangeRequestResponse> getChangeRequestById(@PathVariable Long id) {
        return ResponseEntity.ok(service.getChangeRequestById(id));
    }

    @PostMapping("/requests")
    @PreAuthorize("@perm.can('changeControl', 'CREATE') or hasRole('ADMIN')")
    public ResponseEntity<ChangeRequestResponse> createChangeRequest(
            @Valid @RequestBody ChangeRequestRequest request,
            Authentication authentication) {
        String username = authentication != null ? authentication.getName() : "system";
        return ResponseEntity.status(HttpStatus.CREATED).body(service.createChangeRequest(request, username));
    }

    @PutMapping("/requests/{id}")
    @PreAuthorize("@perm.can('changeControl', 'EDIT') or hasRole('ADMIN')")
    public ResponseEntity<ChangeRequestResponse> updateChangeRequest(
            @PathVariable Long id,
            @Valid @RequestBody ChangeRequestRequest request,
            Authentication authentication) {
        String username = authentication != null ? authentication.getName() : "system";
        return ResponseEntity.ok(service.updateChangeRequest(id, request, username));
    }

    @DeleteMapping("/requests/{id}")
    @PreAuthorize("@perm.can('changeControl', 'DELETE') or hasRole('ADMIN')")
    public ResponseEntity<Void> deleteChangeRequest(
            @PathVariable Long id,
            Authentication authentication) {
        String username = authentication != null ? authentication.getName() : "system";
        service.deleteChangeRequest(id, username);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/requests/{id}/transition")
    @PreAuthorize("@perm.can('changeControl', 'EDIT') or hasRole('ADMIN')")
    public ResponseEntity<ChangeRequestResponse> transitionStatus(
            @PathVariable Long id,
            @RequestParam ChangeStatus nextStatus,
            Authentication authentication) {
        String username = authentication != null ? authentication.getName() : "system";
        return ResponseEntity.ok(service.transitionStatus(id, nextStatus, username));
    }

    // =========================================================================
    // 2. CCB 심의 및 효과성 평가
    // =========================================================================

    @PostMapping("/requests/{id}/ccb-review")
    @PreAuthorize("@perm.can('changeControl', 'EDIT') or hasRole('ADMIN')")
    public ResponseEntity<ChangeRequestResponse> reviewCcb(
            @PathVariable Long id,
            @Valid @RequestBody CcbReviewRequest request,
            Authentication authentication) {
        String username = authentication != null ? authentication.getName() : "system";
        return ResponseEntity.ok(service.reviewCcb(id, request, username));
    }

    @PostMapping("/requests/{id}/effectiveness")
    @PreAuthorize("@perm.can('changeControl', 'EDIT') or hasRole('ADMIN')")
    public ResponseEntity<ChangeRequestResponse> evaluateEffectiveness(
            @PathVariable Long id,
            @Valid @RequestBody ChangeEffectivenessRequest request,
            Authentication authentication) {
        String username = authentication != null ? authentication.getName() : "system";
        return ResponseEntity.ok(service.evaluateEffectiveness(id, request, username));
    }

    // =========================================================================
    // 3. 실행 조치과제 (Change Action Items)
    // =========================================================================

    @GetMapping("/requests/{id}/action-items")
    @PreAuthorize("@perm.can('changeControl', 'VIEW') or hasAnyRole('ADMIN', 'USER')")
    public ResponseEntity<List<ChangeActionItemResponse>> getActionItems(@PathVariable Long id) {
        return ResponseEntity.ok(service.getActionItems(id));
    }

    @PostMapping("/requests/{id}/action-items")
    @PreAuthorize("@perm.can('changeControl', 'CREATE') or hasRole('ADMIN')")
    public ResponseEntity<ChangeActionItemResponse> addActionItem(
            @PathVariable Long id,
            @Valid @RequestBody ChangeActionItemRequest request,
            Authentication authentication) {
        String username = authentication != null ? authentication.getName() : "system";
        return ResponseEntity.status(HttpStatus.CREATED).body(service.addActionItem(id, request, username));
    }

    @PutMapping("/requests/{id}/action-items/{itemId}")
    @PreAuthorize("@perm.can('changeControl', 'EDIT') or hasRole('ADMIN')")
    public ResponseEntity<ChangeActionItemResponse> updateActionItem(
            @PathVariable Long id,
            @PathVariable Long itemId,
            @Valid @RequestBody ChangeActionItemRequest request,
            Authentication authentication) {
        String username = authentication != null ? authentication.getName() : "system";
        return ResponseEntity.ok(service.updateActionItem(id, itemId, request, username));
    }

    @DeleteMapping("/requests/{id}/action-items/{itemId}")
    @PreAuthorize("@perm.can('changeControl', 'DELETE') or hasRole('ADMIN')")
    public ResponseEntity<Void> deleteActionItem(
            @PathVariable Long id,
            @PathVariable Long itemId,
            Authentication authentication) {
        String username = authentication != null ? authentication.getName() : "system";
        service.deleteActionItem(id, itemId, username);
        return ResponseEntity.noContent().build();
    }

    // =========================================================================
    // 4. 6대 KPI 요약 통계
    // =========================================================================

    @GetMapping("/kpi")
    @PreAuthorize("@perm.can('changeControl', 'VIEW') or hasAnyRole('ADMIN', 'USER')")
    public ResponseEntity<ChangeControlKpiResponse> getChangeControlKpis() {
        return ResponseEntity.ok(service.getChangeControlKpis());
    }
}
