package com.example.ims.service;

import com.example.ims.dto.ControlledDocumentMetricsResponse;
import com.example.ims.dto.ControlledDocumentRequest;
import com.example.ims.dto.ControlledDocumentRevisionRequest;
import com.example.ims.entity.*;
import com.example.ims.event.EntityChangeEvent;
import com.example.ims.repository.ControlledDocumentRepository;
import com.example.ims.repository.UserRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * 📂 통제문서 및 개정관리 (DMS) 비즈니스 로직 서비스.
 * ISO 13485 §4.2.4 및 ISO 22716 §17 규제 준수를 위한 문서 수명주기, 개정 추적, 유효성 전이 관리.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ControlledDocumentService {

    private final ControlledDocumentRepository repository;
    private final UserRepository userRepository;
    private final ApplicationEventPublisher eventPublisher;
    private final ObjectMapper objectMapper;

    /**
     * 통제문서 페이징 및 다조건 필터 검색.
     */
    @Transactional(readOnly = true)
    public Page<ControlledDocument> getDocuments(
            String keyword,
            ControlledDocType docType,
            ControlledDocStatus status,
            ProductFamily targetFamily,
            Pageable pageable) {
        return repository.findDocumentsPaged(
                keyword != null && !keyword.trim().isEmpty() ? keyword.trim() : null,
                docType,
                status,
                targetFamily,
                pageable
        );
    }

    /**
     * 통제문서 단건 상세 조회.
     */
    @Transactional(readOnly = true)
    public ControlledDocument getDocumentById(Long id) {
        return repository.findById(id)
                .filter(d -> !Boolean.TRUE.equals(d.getIsDeleted()))
                .orElseThrow(() -> new IllegalArgumentException("해당 통제문서를 찾을 수 없습니다. (ID: " + id + ")"));
    }

    /**
     * 특정 문서 번호의 전체 개정 이력 역순(최신순) 조회.
     */
    @Transactional(readOnly = true)
    public List<ControlledDocument> getDocumentRevisionHistory(String docNo) {
        return repository.findByDocNoAndIsDeletedFalseOrderByRevisionIntDesc(docNo);
    }

    /**
     * 신규 통제문서 최초 등록 (Rev. 0 / Draft).
     */
    @Transactional
    public ControlledDocument createDocument(ControlledDocumentRequest request, String username) {
        String cleanDocNo = request.getDocNo().trim();
        String cleanRev = request.getRevisionNo() != null && !request.getRevisionNo().trim().isEmpty()
                ? request.getRevisionNo().trim() : "Rev. 0";

        if (repository.existsByDocNoAndRevisionNoAndIsDeletedFalse(cleanDocNo, cleanRev)) {
            throw new IllegalArgumentException("이미 등록된 문서 번호와 개정 번호입니다: " + cleanDocNo + " (" + cleanRev + ")");
        }

        int revInt = parseRevisionInt(cleanRev);

        ControlledDocument document = ControlledDocument.builder()
                .docNo(cleanDocNo)
                .title(request.getTitle().trim())
                .docType(request.getDocType())
                .targetFamily(request.getTargetFamily() != null ? request.getTargetFamily() : ProductFamily.COMMON)
                .status(ControlledDocStatus.DRAFT)
                .revisionNo(cleanRev)
                .revisionInt(revInt)
                .changeRationale(request.getChangeRationale() != null ? request.getChangeRationale() : "최초 제정")
                .effectiveDate(request.getEffectiveDate())
                .expirationDate(request.getExpirationDate())
                .department(request.getDepartment())
                .authorName(request.getAuthorName() != null ? request.getAuthorName() : username)
                .reviewerName(request.getReviewerName())
                .approverName(request.getApproverName())
                .content(request.getContent())
                .attachmentUrl(request.getAttachmentUrl())
                .attachmentFileName(request.getAttachmentFileName())
                .attachmentFileSize(request.getAttachmentFileSize())
                .createdBy(username)
                .updatedBy(username)
                .isDeleted(false)
                .build();

        ControlledDocument saved = repository.save(document);
        publishAudit(saved.getId(), "CREATE", username, null, saved, "통제문서 신규 등록: " + saved.getDocNo() + " (" + saved.getRevisionNo() + ")");
        log.info("[DMS] Created controlled document: id={}, docNo={}, rev={}, by={}", saved.getId(), saved.getDocNo(), saved.getRevisionNo(), username);
        return saved;
    }

    /**
     * 통제문서 내용 수정 (DRAFT 또는 UNDER_REVIEW 상태에서만 허용).
     */
    @Transactional
    public ControlledDocument updateDocument(Long id, ControlledDocumentRequest request, String username) {
        ControlledDocument existing = getDocumentById(id);

        if (existing.getStatus() == ControlledDocStatus.EFFECTIVE ||
            existing.getStatus() == ControlledDocStatus.SUPERSEDED ||
            existing.getStatus() == ControlledDocStatus.OBSOLETE) {
            throw new IllegalStateException("이미 배포(Effective), 대체(Superseded), 폐기(Obsolete)된 문서는 직접 수정할 수 없습니다. 새 개정(Revision)을 생성하세요.");
        }

        String oldSnapshot = serialize(existing);

        existing.setTitle(request.getTitle().trim());
        existing.setDocType(request.getDocType());
        if (request.getTargetFamily() != null) {
            existing.setTargetFamily(request.getTargetFamily());
        }
        existing.setChangeRationale(request.getChangeRationale());
        existing.setEffectiveDate(request.getEffectiveDate());
        existing.setExpirationDate(request.getExpirationDate());
        existing.setDepartment(request.getDepartment());
        if (request.getAuthorName() != null) existing.setAuthorName(request.getAuthorName());
        existing.setReviewerName(request.getReviewerName());
        existing.setApproverName(request.getApproverName());
        existing.setContent(request.getContent());
        existing.setAttachmentUrl(request.getAttachmentUrl());
        existing.setAttachmentFileName(request.getAttachmentFileName());
        existing.setAttachmentFileSize(request.getAttachmentFileSize());
        existing.setUpdatedBy(username);

        ControlledDocument saved = repository.save(existing);
        publishAudit(saved.getId(), "UPDATE", username, oldSnapshot, saved, "통제문서 수정: " + saved.getDocNo() + " (" + saved.getRevisionNo() + ")");
        return saved;
    }

    /**
     * 새 개정(Revision) 생성: 기존 배포(EFFECTIVE) 문서를 모태로 신규 개정판 초안(DRAFT)을 생성.
     */
    @Transactional
    public ControlledDocument createRevision(Long parentDocumentId, ControlledDocumentRevisionRequest request, String username) {
        ControlledDocument parent = getDocumentById(parentDocumentId);

        String cleanRev = request.getRevisionNo().trim();
        if (repository.existsByDocNoAndRevisionNoAndIsDeletedFalse(parent.getDocNo(), cleanRev)) {
            throw new IllegalArgumentException("이미 존재하는 개정 번호입니다: " + parent.getDocNo() + " (" + cleanRev + ")");
        }

        int nextRevInt = Math.max(parent.getRevisionInt() + 1, parseRevisionInt(cleanRev));

        ControlledDocument nextRevision = ControlledDocument.builder()
                .docNo(parent.getDocNo())
                .title(request.getTitle() != null && !request.getTitle().trim().isEmpty() ? request.getTitle().trim() : parent.getTitle())
                .docType(parent.getDocType())
                .targetFamily(parent.getTargetFamily())
                .status(ControlledDocStatus.DRAFT)
                .revisionNo(cleanRev)
                .revisionInt(nextRevInt)
                .parentDocumentId(parent.getId())
                .changeRationale(request.getChangeRationale().trim())
                .effectiveDate(request.getEffectiveDate())
                .expirationDate(request.getExpirationDate())
                .department(request.getDepartment() != null ? request.getDepartment() : parent.getDepartment())
                .authorName(request.getAuthorName() != null ? request.getAuthorName() : username)
                .reviewerName(request.getReviewerName())
                .approverName(request.getApproverName())
                .content(request.getContent() != null ? request.getContent() : parent.getContent())
                .attachmentUrl(request.getAttachmentUrl() != null ? request.getAttachmentUrl() : parent.getAttachmentUrl())
                .attachmentFileName(request.getAttachmentFileName() != null ? request.getAttachmentFileName() : parent.getAttachmentFileName())
                .attachmentFileSize(request.getAttachmentFileSize() != null ? request.getAttachmentFileSize() : parent.getAttachmentFileSize())
                .createdBy(username)
                .updatedBy(username)
                .isDeleted(false)
                .build();

        ControlledDocument saved = repository.save(nextRevision);
        publishAudit(saved.getId(), "CREATE_REVISION", username, parent, saved,
                "통제문서 개정 초안 생성: " + saved.getDocNo() + " (기존 " + parent.getRevisionNo() + " -> 신규 " + saved.getRevisionNo() + ")");
        log.info("[DMS] Created new revision: id={}, docNo={}, rev={}, parentId={}", saved.getId(), saved.getDocNo(), saved.getRevisionNo(), parent.getId());
        return saved;
    }

    /**
     * 문서 상태 라이프사이클 전이 (DRAFT -> UNDER_REVIEW -> APPROVED -> EFFECTIVE -> OBSOLETE).
     * 신규 문서가 EFFECTIVE(배포)로 변경되면, 이전 EFFECTIVE 문서는 자동으로 SUPERSEDED로 상태 전이.
     */
    @Transactional
    public ControlledDocument changeStatus(Long id, ControlledDocStatus newStatus, String reason, String username) {
        ControlledDocument document = getDocumentById(id);
        ControlledDocStatus oldStatus = document.getStatus();

        if (oldStatus == newStatus) {
            return document;
        }

        // 유효화(EFFECTIVE) 처리 시 구버전 자동 개정대체(SUPERSEDED) 전이
        if (newStatus == ControlledDocStatus.EFFECTIVE) {
            repository.findFirstByDocNoAndStatusAndIsDeletedFalse(document.getDocNo(), ControlledDocStatus.EFFECTIVE)
                    .ifPresent(existingEffective -> {
                        if (!existingEffective.getId().equals(document.getId())) {
                            existingEffective.setStatus(ControlledDocStatus.SUPERSEDED);
                            existingEffective.setUpdatedBy(username);
                            repository.save(existingEffective);
                            publishAudit(existingEffective.getId(), "SUPERSEDED", username,
                                    "EFFECTIVE", "SUPERSEDED",
                                    "새 개정판(" + document.getRevisionNo() + ") 배포 승인에 따른 구버전 대체(SUPERSEDED) 자동 전환");
                            log.info("[DMS] Superseded old document version: id={}, docNo={}, rev={}",
                                    existingEffective.getId(), existingEffective.getDocNo(), existingEffective.getRevisionNo());
                        }
                    });

            if (document.getEffectiveDate() == null) {
                document.setEffectiveDate(LocalDate.now());
            }
        }

        document.setStatus(newStatus);
        document.setUpdatedBy(username);
        ControlledDocument saved = repository.save(document);

        String auditDesc = "문서 상태 전이: " + oldStatus + " -> " + newStatus + (reason != null ? " (" + reason + ")" : "");
        publishAudit(saved.getId(), "STATUS_CHANGE", username, oldStatus.name(), newStatus.name(), auditDesc);
        log.info("[DMS] Status transitioned: id={}, docNo={}, rev={}, {} -> {}", saved.getId(), saved.getDocNo(), saved.getRevisionNo(), oldStatus, newStatus);
        return saved;
    }

    /**
     * 통제문서 소프트 딜리트 (규제 감사 이력 보존).
     * 배포(EFFECTIVE) 상태의 문서는 무단 삭제 불가 (먼저 폐기(OBSOLETE) 상태로 전이 필요).
     */
    @Transactional
    public void softDeleteDocument(Long id, String username) {
        ControlledDocument document = getDocumentById(id);

        if (document.getStatus() == ControlledDocStatus.EFFECTIVE) {
            throw new IllegalStateException("현재 배포/유효(EFFECTIVE) 상태인 통제문서는 직접 삭제할 수 없습니다. 먼저 폐기(OBSOLETE) 승인 처리를 진행하십시오.");
        }

        document.setIsDeleted(true);
        document.setDeletedAt(LocalDateTime.now());
        document.setUpdatedBy(username);
        repository.save(document);

        publishAudit(document.getId(), "DELETE", username, document, null, "통제문서 소프트 삭제: " + document.getDocNo() + " (" + document.getRevisionNo() + ")");
        log.info("[DMS] Soft-deleted document: id={}, docNo={}, rev={}, by={}", document.getId(), document.getDocNo(), document.getRevisionNo(), username);
    }

    /**
     * 통제문서 종합 현황 KPI 메트릭 조회.
     */
    @Transactional(readOnly = true)
    public ControlledDocumentMetricsResponse getMetrics() {
        return ControlledDocumentMetricsResponse.builder()
                .totalDocuments(repository.countByIsDeletedFalse())
                .effectiveCount(repository.countByStatusAndIsDeletedFalse(ControlledDocStatus.EFFECTIVE))
                .draftCount(repository.countByStatusAndIsDeletedFalse(ControlledDocStatus.DRAFT))
                .reviewCount(repository.countByStatusAndIsDeletedFalse(ControlledDocStatus.UNDER_REVIEW))
                .approvedCount(repository.countByStatusAndIsDeletedFalse(ControlledDocStatus.APPROVED))
                .supersededCount(repository.countByStatusAndIsDeletedFalse(ControlledDocStatus.SUPERSEDED))
                .obsoleteCount(repository.countByStatusAndIsDeletedFalse(ControlledDocStatus.OBSOLETE))
                .cosmeticsCount(repository.countByTargetFamilyAndIsDeletedFalse(ProductFamily.COSMETICS))
                .medicalDeviceCount(repository.countByTargetFamilyAndIsDeletedFalse(ProductFamily.MEDICAL_DEVICE))
                .commonCount(repository.countByTargetFamilyAndIsDeletedFalse(ProductFamily.COMMON))
                .build();
    }

    private int parseRevisionInt(String revStr) {
        if (revStr == null) return 0;
        try {
            Matcher matcher = Pattern.compile("(\\d+)").matcher(revStr);
            if (matcher.find()) {
                return Integer.parseInt(matcher.group(1));
            }
        } catch (Exception ignored) {}
        return 0;
    }

    private void publishAudit(Long entityId, String action, String username, Object oldEntity, Object newEntity, String description) {
        User user = null;
        if (username != null) {
            user = userRepository.findByUsername(username).orElse(null);
        }

        EntityChangeEvent event = EntityChangeEvent.builder()
                .entityType("ControlledDocument")
                .entityId(entityId)
                .action(action)
                .modifier(username)
                .modifierId(user != null ? user.getId() : null)
                .modifierUsername(username)
                .modifierName(user != null ? user.getName() : username)
                .modifierCompany(user != null ? user.getCompanyName() : null)
                .description(description)
                .oldEntity(oldEntity)
                .newEntity(newEntity)
                .build();

        eventPublisher.publishEvent(event);
    }

    private String serialize(Object obj) {
        try {
            return objectMapper.writeValueAsString(obj);
        } catch (Exception e) {
            return String.valueOf(obj);
        }
    }
}
