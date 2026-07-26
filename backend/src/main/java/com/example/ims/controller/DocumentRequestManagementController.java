package com.example.ims.controller;

import com.example.ims.entity.*;
import com.example.ims.repository.CustomDocumentTypeRepository;
import com.example.ims.repository.DocumentRequirementRepository;
import com.example.ims.repository.DocumentRequirementSpecification;
import com.example.ims.service.DocumentRequestService;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@RestController
@RequestMapping("/api/document-requests")
@PreAuthorize("hasAnyRole('ADMIN', 'QUALITY', 'QUALITY_TEAM', 'MANUFACTURER')")
@RequiredArgsConstructor
public class DocumentRequestManagementController {

    private static final Logger log = LoggerFactory.getLogger(DocumentRequestManagementController.class);

    private final DocumentRequirementRepository requirementRepository;
    private final CustomDocumentTypeRepository customDocumentTypeRepository;
    private final DocumentRequestService requestService;
    private final com.example.ims.service.AuditLogService auditLogService;
    private final com.example.ims.repository.UserRepository userRepository;
    private final com.example.ims.repository.SystemSettingRepository settingRepository;
    private final com.example.ims.repository.DocumentRequirementHistoryRepository historyRepository;
    private final com.example.ims.repository.ProductRepository productRepository;

    /**
     * 필터 조건 및 페이징 처리를 지원하는 품질 서류 요구사항 리스트 조회 API
     */
    @GetMapping
    public ResponseEntity<?> getDocumentRequirements(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String manufacturer,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String scope,
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate,
            @RequestParam(required = false) String itemCode,
            @RequestParam(required = false) String productName,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "200") int size,
            @org.springframework.security.core.annotation.AuthenticationPrincipal org.springframework.security.core.userdetails.UserDetails userDetails
    ) {
        Long manufacturerId = null;
        if (userDetails != null) {
            com.example.ims.entity.User user = userRepository.findByUsername(userDetails.getUsername()).orElse(null);
            if (user != null && user.getRole() != null &&
               (user.getRole().equals("ROLE_MANUFACTURER") || user.getRole().equals("MANUFACTURER"))) {
                if (user.getManufacturer() != null) {
                    manufacturerId = user.getManufacturer().getId();
                }
            }
        }

        Specification<DocumentRequirement> spec = DocumentRequirementSpecification.filterBy(
                search, manufacturer, status, scope, startDate, endDate, itemCode, productName, manufacturerId
        );
        
        Sort sort = Sort.by(
            Sort.Order.desc("status"),
            Sort.Order.asc("nextDueDate")
        );
        
        PageRequest pageRequest = PageRequest.of(page, size, sort);
        Page<DocumentRequirement> result = requirementRepository.findAll(spec, pageRequest);
        
        return ResponseEntity.ok(result);
    }

    /**
     * 특정 수동 요구 서류 건에 대해 이메일 즉시 재발송 (Audit Log 기록)
     */
    @PostMapping("/{requirementId}/re-request")
    public ResponseEntity<?> reRequestDocument(
            @PathVariable Long requirementId,
            @RequestBody ReRequestPayload payload,
            @org.springframework.security.core.annotation.AuthenticationPrincipal org.springframework.security.core.userdetails.UserDetails userDetails
    ) {
        try {
            DocumentRequirement req = requirementRepository.findById(requirementId)
                    .orElseThrow(() -> new IllegalArgumentException("요청 대상을 찾을 수 없습니다."));
            
            requestService.sendEmailRequest(req, payload.getRecipientEmail());

            String username = (userDetails != null) ? userDetails.getUsername() : "SYSTEM";
            try {
                auditLogService.logAction(
                    username,
                    "DOCUMENT_RE_REQUEST",
                    "서류 요구사항 재발송",
                    String.format("서류 ID [%d] 수신처 [%s]로 재발송 완료", requirementId, payload.getRecipientEmail())
                );
            } catch (Exception auditEx) {
                log.error("Failed to log audit for document re-request", auditEx);
            }

            return ResponseEntity.ok().body("{\"message\": \"성공적으로 이메일 요청을 발송하였습니다.\"}");
        } catch (Exception e) {
            log.error("Failed to manual re-request document: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().body("{\"error\": \"재발송 실패\", \"message\": \"" + e.getMessage() + "\"}");
        }
    }

    /**
     * 개별 서류 요구조건의 제출기한(nextDueDate) 수동 지정/수정 API
     */
    @PutMapping("/{id}/due-date")
    @PreAuthorize("hasAnyRole('ADMIN', 'QUALITY')")
    public ResponseEntity<?> updateDueDate(
            @PathVariable Long id,
            @RequestBody UpdateDueDatePayload payload
    ) {
        DocumentRequirement req = requirementRepository.findById(id).orElse(null);
        if (req == null) {
            return ResponseEntity.notFound().build();
        }
        if (payload.getDueDate() != null && !payload.getDueDate().trim().isEmpty()) {
            req.setNextDueDate(java.time.LocalDate.parse(payload.getDueDate().trim()));
        } else {
            req.setNextDueDate(null);
        }
        requirementRepository.save(req);
        return ResponseEntity.ok().body("{\"message\": \"제출 기한이 성공적으로 업데이트되었습니다.\"}");
    }

    @Data
    public static class UpdateDueDatePayload {
        private String dueDate;
    }

    /**
     * 선택된 복수의 필수 서류 항목들에 대해 일괄 이메일 재발송 (Audit Log 기록)
     */
    @PostMapping("/batch-re-request")
    public ResponseEntity<?> batchReRequestDocuments(
            @RequestBody BatchReRequestPayload payload,
            @org.springframework.security.core.annotation.AuthenticationPrincipal org.springframework.security.core.userdetails.UserDetails userDetails
    ) {
        try {
            int sentCount = requestService.sendBatchDocumentRequests(payload.getRequirementIds(), payload.getRecipientEmail());

            String username = (userDetails != null) ? userDetails.getUsername() : "SYSTEM";
            try {
                auditLogService.logAction(
                    username,
                    "DOCUMENT_BATCH_RE_REQUEST",
                    "서류 요구사항 일괄 선택 재발송",
                    String.format("서류 [%d]건 수신처 [%s]로 일괄 재발송 완료", sentCount, payload.getRecipientEmail())
                );
            } catch (Exception auditEx) {
                log.error("Failed to log audit for document batch re-request", auditEx);
            }

            return ResponseEntity.ok().body("{\"message\": \"성공적으로 " + sentCount + "건의 선택 서류 재발송 요청을 발송하였습니다.\", \"sentCount\": " + sentCount + "}");
        } catch (Exception e) {
            log.error("Failed to batch re-request documents: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().body("{\"error\": \"일괄 재발송 실패\", \"message\": \"" + e.getMessage() + "\"}");
        }
    }

    @Data
    public static class BatchReRequestPayload {
        private List<Long> requirementIds;
        private String recipientEmail;
    }

    /**
     * 서류 종류별 자동 발송/갱신 주기 및 D-Day 설정 조회 API
     */
    @GetMapping("/cycle-configs")
    public ResponseEntity<?> getCycleConfigs() {
        com.example.ims.entity.SystemSetting setting = settingRepository.findById("DOCUMENT_CYCLE_CONFIGS").orElse(null);
        if (setting == null) {
            String defaultConfig = "{" +
                    "\"MSDS\":{\"periodMonths\":12,\"reminderDDay\":14}," +
                    "\"MANUFACTURING_PROCESS_CHART\":{\"periodMonths\":0,\"reminderDDay\":14}," +
                    "\"PRODUCT_STANDARD\":{\"periodMonths\":0,\"reminderDDay\":14}," +
                    "\"STABILITY_TEST\":{\"periodMonths\":0,\"reminderDDay\":14}," +
                    "\"COA\":{\"periodMonths\":1,\"reminderDDay\":7}" +
                    "}";
            return ResponseEntity.ok(defaultConfig);
        }
        return ResponseEntity.ok(setting.getSettingValue());
    }

    /**
     * 서류 종류별 자동 발송/갱신 주기 및 D-Day 설정 저장 API
     */
    @PostMapping("/cycle-configs")
    @PreAuthorize("hasAnyRole('ADMIN', 'QUALITY')")
    public ResponseEntity<?> saveCycleConfigs(@RequestBody String configJson) {
        com.example.ims.entity.SystemSetting setting = settingRepository.findById("DOCUMENT_CYCLE_CONFIGS")
                .orElse(com.example.ims.entity.SystemSetting.builder()
                        .settingKey("DOCUMENT_CYCLE_CONFIGS")
                        .description("서류 종류별 자동 발송/갱신 주기 및 D-Day 알림 설정")
                        .build());
        setting.setSettingValue(configJson);
        setting.setUpdatedAt(java.time.LocalDateTime.now());
        settingRepository.save(setting);
        return ResponseEntity.ok().body("{\"message\": \"서류 갱신 주기 설정이 성공적으로 저장되었습니다.\"}");
    }

    /**
     * 관리자용 기존 DB 전체 마스터 품목 서류 요구조건 수동 1회 일괄 동기화/생성 API
     */
    @PostMapping("/sync-masters")
    @PreAuthorize("hasAnyRole('ADMIN', 'QUALITY')")
    public ResponseEntity<?> syncAllMasters() {
        int syncedCount = requestService.syncAllMasterProductRequirements();
        return ResponseEntity.ok().body("{\"message\": \"성공적으로 " + syncedCount + "개 마스터 품목의 필수 서류 요구사항이 동기화 생성되었습니다.\", \"syncedCount\": " + syncedCount + "}");
    }

    /**
     * 제조사 보안 링크 전용 정보 조회 API (제조사 소속 데이터 격리 반환)
     */
    @GetMapping("/vendor-portal")
    @PreAuthorize("permitAll()")
    public ResponseEntity<?> getVendorPortalData(@RequestParam String token) {
        if (token == null || token.trim().isEmpty()) {
            return ResponseEntity.badRequest().body("{\"message\": \"보안 토큰이 유효하지 않습니다.\"}");
        }

        DocumentRequirement req = requirementRepository.findBySecurityToken(token.trim()).orElse(null);
        if (req == null) {
            return ResponseEntity.status(404).body("{\"message\": \"해당 보안 토큰과 연결된 서류 요구사항을 찾을 수 없습니다.\"}");
        }

        Product product = null;
        if (req.getProductId() != null) {
            product = productRepository.findById(req.getProductId()).orElse(null);
        }

        List<Product> childProducts = List.of();
        if (product != null && product.getItemCode() != null) {
            final String parentCode = product.getItemCode();
            childProducts = productRepository.findAll().stream()
                    .filter(p -> parentCode.equals(p.getParentItemCode()))
                    .toList();
        }

        var histories = historyRepository.findByRequirementIdOrderByUploadedAtDesc(req.getId());

        return ResponseEntity.ok(java.util.Map.of(
                "requirement", req,
                "product", product != null ? product : java.util.Collections.emptyMap(),
                "childProducts", childProducts,
                "histories", histories
        ));
    }

    /**
     * 제조사 보안 포털 서류 (PDF / 이미지) 업로드 및 변경 이력 기록 API
     */
    @PostMapping("/vendor-upload")
    @PreAuthorize("permitAll()")
    public ResponseEntity<?> uploadVendorDocument(@RequestBody VendorUploadPayload payload) {
        if (payload.getToken() == null || payload.getToken().trim().isEmpty()) {
            return ResponseEntity.badRequest().body("{\"message\": \"보안 토큰이 필요합니다.\"}");
        }

        DocumentRequirement req = requirementRepository.findBySecurityToken(payload.getToken().trim()).orElse(null);
        if (req == null) {
            return ResponseEntity.status(404).body("{\"message\": \"유효하지 않은 보안 토큰입니다.\"}");
        }

        req.setStatus(DocumentStatus.FULFILLED);
        req.setLastReceivedDate(LocalDate.now());
        req.setLastUploadedBy(payload.getUploaderName() != null ? payload.getUploaderName().trim() : "제조사 담당자");
        req.setLastUploadedAt(java.time.LocalDateTime.now());
        requirementRepository.save(req);

        // 이력 기록 저장
        DocumentRequirementHistory history = DocumentRequirementHistory.builder()
                .requirementId(req.getId())
                .fileName(payload.getFileName())
                .fileUrl(payload.getFileUrl())
                .uploadedBy(payload.getUploaderName() != null ? payload.getUploaderName().trim() : "제조사 담당자")
                .uploadedAt(java.time.LocalDateTime.now())
                .changeReason(payload.getChangeReason() != null ? payload.getChangeReason().trim() : "서류 업로드/갱신 제출")
                .status(DocumentStatus.FULFILLED)
                .build();
        historyRepository.save(history);

        // 감사 로그 기록
        try {
            auditLogService.logAction(
                    payload.getUploaderName() != null ? payload.getUploaderName() : "VENDOR",
                    "VENDOR_DOCUMENT_UPLOAD",
                    "제조사 품질서류 제출",
                    String.format("서류 ID [%d] 파일명 [%s] 제출 완료", req.getId(), payload.getFileName())
            );
        } catch (Exception e) {
            log.error("Failed to log audit for vendor upload", e);
        }

        return ResponseEntity.ok().body("{\"message\": \"성공적으로 서류가 업로드 및 제출 완료되었습니다.\"}");
    }

    /**
     * 개별 요구서류 변경 이력 타임라인 조회 API
     */
    @GetMapping("/{id}/histories")
    public ResponseEntity<?> getRequirementHistories(@PathVariable Long id) {
        List<DocumentRequirementHistory> histories = historyRepository.findByRequirementIdOrderByUploadedAtDesc(id);
        return ResponseEntity.ok(histories);
    }

    @Data
    public static class VendorUploadPayload {
        private String token;
        private String fileName;
        private String fileUrl;
        private String uploaderName;
        private String changeReason;
    }
    @GetMapping("/custom-types")
    public ResponseEntity<?> getCustomDocumentTypes() {
        return ResponseEntity.ok(customDocumentTypeRepository.findAll());
    }

    /**
     * 관리자용 신규 커스텀 주기 서류 종류 추가
     */
    @PostMapping("/custom-types")
    public ResponseEntity<?> createCustomDocumentType(@RequestBody CustomDocumentType reqType) {
        if (reqType.getName() == null || reqType.getName().trim().isEmpty()) {
            return ResponseEntity.badRequest().body("{\"message\": \"문서명은 필수 입력 항목입니다.\"}");
        }
        if (reqType.getScope() == null) {
            return ResponseEntity.badRequest().body("{\"message\": \"적용 범위(PRODUCT/MANUFACTURER)를 선택해야 합니다.\"}");
        }
        if (reqType.getPeriodMonths() == null) {
            reqType.setPeriodMonths(12); // 디폴트 1년
        }

        try {
            CustomDocumentType saved = customDocumentTypeRepository.save(reqType);
            
            // 기존 등록 대상들에 대해서도 요구 조건을 일제히 스케줄링 생성 트리거 작동
            requestService.initializeCustomRequirementsForAllTargets(saved);
            
            return ResponseEntity.ok(saved);
        } catch (Exception e) {
            log.error("Failed to create custom document type: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().body("{\"error\": \"저장 실패\", \"message\": \"" + e.getMessage() + "\"}");
        }
    }

    /**
     * 커스텀 서류 종류 비활성화 및 수정 처리
     */
    @PutMapping("/custom-types/{id}")
    public ResponseEntity<?> updateCustomDocumentType(
            @PathVariable Long id,
            @RequestBody CustomDocumentType reqData
    ) {
        return customDocumentTypeRepository.findById(id)
                .map(existing -> {
                    if (reqData.getIsActive() != null) {
                        existing.setIsActive(reqData.getIsActive());
                    }
                    if (reqData.getName() != null) {
                        existing.setName(reqData.getName());
                    }
                    CustomDocumentType saved = customDocumentTypeRepository.save(existing);
                    return ResponseEntity.ok(saved);
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @Data
    public static class ReRequestPayload {
        private String recipientEmail;
    }
}
