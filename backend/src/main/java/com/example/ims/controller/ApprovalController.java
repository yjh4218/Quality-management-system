package com.example.ims.controller;

import com.example.ims.dto.*;
import com.example.ims.entity.ApprovalDocument;
import com.example.ims.repository.ApprovalDocumentRepository;
import com.example.ims.service.ApprovalService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/approvals")
@RequiredArgsConstructor
@Slf4j
@PreAuthorize("!hasRole('MANUFACTURER')")
public class ApprovalController {

    private final ApprovalService approvalService;
    private final ApprovalDocumentRepository documentRepository;

    /**
     * 결재 상신
     */
    @PostMapping
    public ResponseEntity<ApprovalDocumentDetailDto> submitApproval(
            @RequestBody ApprovalSubmitRequestDto dto,
            Principal principal) {
        return ResponseEntity.ok(approvalService.submitApproval(dto, principal.getName()));
    }

    /**
     * 결재함 탭별 목록 조회
     * tab: PENDING (수신함), SUBMITTED (기안함), IN_PROGRESS (진행중), COMPLETED (완료함), REJECTED (반려함), REFERENCE (참조함), PROCESSED (결재내역)
     */
    @GetMapping
    public ResponseEntity<Page<ApprovalDocumentSummaryDto>> getInbox(
            @RequestParam(defaultValue = "PENDING") String tab,
            @PageableDefault(size = 20) Pageable pageable,
            Principal principal) {
        return ResponseEntity.ok(approvalService.getInbox(tab, principal.getName(), pageable));
    }

    /**
     * 결재함별 미열람 문서 건수 조회 (정적 경로이므로 /{id}보다 위에 위치)
     */
    @GetMapping("/unread-counts")
    public ResponseEntity<Map<String, Long>> getUnreadCounts(Principal principal) {
        return ResponseEntity.ok(approvalService.getUnreadCounts(principal.getName()));
    }

    /**
     * 원본 레코드 기준 최신 결재 상태 확인 (기존 업무 화면에서 결재 버튼 상태 연동용)
     */
    @GetMapping("/status-by-source")
    public ResponseEntity<Map<String, Object>> getApprovalStatusBySource(
            @RequestParam String docTypeCode,
            @RequestParam Long sourceRecordId) {
        List<ApprovalDocument> docs = documentRepository.findByDocTypeCodeAndSourceRecordIdOrderByCreatedAtDesc(docTypeCode, sourceRecordId);
        if (docs.isEmpty()) {
            return ResponseEntity.ok(Map.of("hasApproval", false));
        }

        ApprovalDocument latest = docs.get(0);
        return ResponseEntity.ok(Map.of(
                "hasApproval", true,
                "documentId", latest.getId(),
                "status", latest.getStatus(),
                "title", latest.getTitle(),
                "submittedAt", latest.getSubmittedAt() != null ? latest.getSubmittedAt().toString() : "",
                "completedAt", latest.getCompletedAt() != null ? latest.getCompletedAt().toString() : ""
        ));
    }

    /**
     * 결재 문서 상세 조회
     */
    @GetMapping("/{id:\\d+}")
    public ResponseEntity<ApprovalDocumentDetailDto> getDocumentDetail(
            @PathVariable Long id,
            Principal principal) {
        return ResponseEntity.ok(approvalService.getDocumentDetail(id, principal.getName()));
    }

    /**
     * 결재 승인
     */
    @PostMapping("/{id}/approve")
    public ResponseEntity<ApprovalDocumentDetailDto> approve(
            @PathVariable Long id,
            @RequestBody(required = false) ApprovalActionRequestDto dto,
            Principal principal) {
        return ResponseEntity.ok(approvalService.approve(id, dto, principal.getName()));
    }

    /**
     * 결재 반려
     */
    @PostMapping("/{id}/reject")
    public ResponseEntity<ApprovalDocumentDetailDto> reject(
            @PathVariable Long id,
            @RequestBody ApprovalActionRequestDto dto,
            Principal principal) {
        return ResponseEntity.ok(approvalService.reject(id, dto, principal.getName()));
    }

    /**
     * 결재 회수
     */
    @PostMapping("/{id}/recall")
    public ResponseEntity<ApprovalDocumentDetailDto> recall(
            @PathVariable Long id,
            Principal principal) {
        return ResponseEntity.ok(approvalService.recall(id, principal.getName()));
    }

    /**
     * 결재 수정 후 재상신
     */
    @PostMapping("/{id}/resubmit")
    public ResponseEntity<ApprovalDocumentDetailDto> resubmit(
            @PathVariable Long id,
            @RequestBody ApprovalSubmitRequestDto dto,
            Principal principal) {
        return ResponseEntity.ok(approvalService.resubmit(id, dto, principal.getName()));
    }

    /**
     * Ad-hoc 결재자/참조자 추가
     */
    @PostMapping("/{id}/adhoc-approver")
    public ResponseEntity<ApprovalDocumentDetailDto> addAdhocApprover(
            @PathVariable Long id,
            @RequestBody Map<String, Object> body,
            Principal principal) {
        Long targetUserId = Long.valueOf(body.get("userId").toString());
        String stepType = body.getOrDefault("stepType", "APPROVAL").toString();
        return ResponseEntity.ok(approvalService.addAdhocApprover(id, targetUserId, stepType, principal.getName()));
    }

    /**
     * 결재 문서 읽음 처리
     */
    @PostMapping("/{id:\\d+}/read")
    public ResponseEntity<Map<String, Object>> markAsRead(
            @PathVariable Long id,
            Principal principal) {
        approvalService.markAsRead(id, principal.getName());
        return ResponseEntity.ok(Map.of("success", true, "documentId", id));
    }
}
