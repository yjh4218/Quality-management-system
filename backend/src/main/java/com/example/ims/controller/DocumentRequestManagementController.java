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
@PreAuthorize("hasAnyRole('ADMIN', 'QUALITY', 'QUALITY_TEAM')")
public class DocumentRequestManagementController {

    private static final Logger log = LoggerFactory.getLogger(DocumentRequestManagementController.class);

    private final DocumentRequirementRepository requirementRepository;
    private final CustomDocumentTypeRepository customDocumentTypeRepository;
    private final DocumentRequestService requestService;

    public DocumentRequestManagementController(
            DocumentRequirementRepository requirementRepository,
            CustomDocumentTypeRepository customDocumentTypeRepository,
            DocumentRequestService requestService) {
        this.requirementRepository = requirementRepository;
        this.customDocumentTypeRepository = customDocumentTypeRepository;
        this.requestService = requestService;
    }

    /**
     * 필터 조건 및 페이징 처리를 지원하는 품질 서류 요구사항 리스트 조회 API
     */
    @GetMapping
    public ResponseEntity<?> getDocumentRequirements(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String manufacturer,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String scope,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        Specification<DocumentRequirement> spec = DocumentRequirementSpecification.filterBy(search, manufacturer, status, scope);
        
        // OVERDUE(기한 초과)인 항목이 항상 최상단에 우선 정렬되도록 구성합니다.
        Sort sort = Sort.by(
            Sort.Order.desc("status"), // OVERDUE 상태 정렬 우대를 위해 서비스 레벨 정렬 및 db 정렬 우선
            Sort.Order.asc("nextDueDate")
        );
        
        PageRequest pageRequest = PageRequest.of(page, size, sort);
        Page<DocumentRequirement> result = requirementRepository.findAll(spec, pageRequest);
        
        return ResponseEntity.ok(result);
    }

    /**
     * 수동 즉시 이메일 재발송 엔드포인트
     */
    @PostMapping("/{requirementId}/re-request")
    public ResponseEntity<?> reRequestDocument(
            @PathVariable Long requirementId,
            @RequestBody ReRequestPayload payload
    ) {
        try {
            DocumentRequirement req = requirementRepository.findById(requirementId)
                    .orElseThrow(() -> new IllegalArgumentException("요청 대상을 찾을 수 없습니다."));
            
            requestService.sendEmailRequest(req, payload.getRecipientEmail());
            return ResponseEntity.ok().body("{\"message\": \"성공적으로 이메일 요청을 발송하였습니다.\"}");
        } catch (Exception e) {
            log.error("Failed to manual re-request document: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().body("{\"error\": \"재발송 실패\", \"message\": \"" + e.getMessage() + "\"}");
        }
    }

    /**
     * 커스텀 추가 서류 종류 리스트 조회
     */
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
