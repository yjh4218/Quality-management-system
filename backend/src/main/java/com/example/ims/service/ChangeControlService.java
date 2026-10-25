package com.example.ims.service;

import com.example.ims.dto.*;
import com.example.ims.entity.*;
import com.example.ims.repository.ChangeActionItemRepository;
import com.example.ims.repository.ChangeRequestRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

/**
 * 🔄 변경관리(Change Control) 통합 비즈니스 로직 서비스
 * ISO 13485:2016 §7.3.9 / ISO 22716:2007 §11 / 21 CFR 820.70
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ChangeControlService {

    private final ChangeRequestRepository changeRequestRepository;
    private final ChangeActionItemRepository changeActionItemRepository;
    private final AuditLogService auditLogService;

    // =========================================================================
    // 1. 변경요청서 (Change Request) CRUD & 검색
    // =========================================================================

    public Page<ChangeRequestResponse> getChangeRequests(
            String keyword, ChangeCategory category, ChangeUrgency urgency, ChangeStatus status, int page, int size) {
        Pageable pageable = PageRequest.of(Math.max(0, page), Math.max(1, size));
        String cleanedKeyword = (keyword != null && !keyword.trim().isEmpty()) ? keyword.trim() : null;
        return changeRequestRepository.searchChangeRequests(cleanedKeyword, category, urgency, status, pageable)
                .map(ChangeRequestResponse::fromEntity);
    }

    public ChangeRequestResponse getChangeRequestById(Long id) {
        ChangeRequest cr = findChangeRequestOrThrow(id);
        return ChangeRequestResponse.fromEntity(cr);
    }

    @Transactional
    public ChangeRequestResponse createChangeRequest(ChangeRequestRequest dto, String username) {
        String changeNumber = dto.getChangeNumber();
        if (changeNumber == null || changeNumber.trim().isEmpty()) {
            changeNumber = generateNextChangeNumber();
        } else if (changeRequestRepository.existsByChangeNumberAndIsDeletedFalse(changeNumber.trim())) {
            throw new IllegalArgumentException("이미 사용 중인 변경 관리번호입니다: " + changeNumber);
        }

        ChangeRequest entity = ChangeRequest.builder()
                .changeNumber(changeNumber.trim())
                .title(dto.getTitle())
                .category(dto.getCategory() != null ? dto.getCategory() : ChangeCategory.PRODUCT)
                .urgency(dto.getUrgency() != null ? dto.getUrgency() : ChangeUrgency.STANDARD)
                .status(dto.getStatus() != null ? dto.getStatus() : ChangeStatus.DRAFT)
                .targetItemName(dto.getTargetItemName())
                .itemCode(dto.getItemCode())
                .initiatorName(dto.getInitiatorName())
                .department(dto.getDepartment())
                .requestDate(dto.getRequestDate() != null ? dto.getRequestDate() : LocalDate.now())
                .targetCompletionDate(dto.getTargetCompletionDate())
                .actualCompletionDate(dto.getActualCompletionDate())
                .changeReason(dto.getChangeReason())
                .currentState(dto.getCurrentState())
                .proposedChange(dto.getProposedChange())
                .regulatoryImpact(dto.getRegulatoryImpact())
                .regulatoryDetails(dto.getRegulatoryDetails())
                .qualitySafetyImpact(dto.getQualitySafetyImpact())
                .qualityDetails(dto.getQualityDetails())
                .validationRequired(dto.getValidationRequired())
                .validationDetails(dto.getValidationDetails())
                .riskAssessmentId(dto.getRiskAssessmentId())
                .riskAssessmentCode(dto.getRiskAssessmentCode())
                .dmsDocumentId(dto.getDmsDocumentId())
                .dmsDocumentNumber(dto.getDmsDocumentNumber())
                .designProjectId(dto.getDesignProjectId())
                .designProjectCode(dto.getDesignProjectCode())
                .effectivenessRequired(dto.getEffectivenessRequired())
                .effectivenessDueDate(dto.getEffectivenessDueDate())
                .effectivenessStatus(EffectivenessStatus.PENDING)
                .isDeleted(false)
                .createdBy(username)
                .updatedBy(username)
                .build();

        ChangeRequest saved = changeRequestRepository.save(entity);
        auditLogService.logAction(username, "CREATE", "CHANGE_REQUEST: " + saved.getChangeNumber(),
                "신규 변경요청 등록: " + saved.getTitle());
        log.info("[CHANGE CONTROL] New Change Request Created: {} by {}", saved.getChangeNumber(), username);
        return ChangeRequestResponse.fromEntity(saved);
    }

    @Transactional
    public ChangeRequestResponse updateChangeRequest(Long id, ChangeRequestRequest dto, String username) {
        ChangeRequest entity = findChangeRequestOrThrow(id);

        entity.setTitle(dto.getTitle());
        if (dto.getCategory() != null) entity.setCategory(dto.getCategory());
        if (dto.getUrgency() != null) entity.setUrgency(dto.getUrgency());
        if (dto.getStatus() != null) entity.setStatus(dto.getStatus());
        entity.setTargetItemName(dto.getTargetItemName());
        entity.setItemCode(dto.getItemCode());
        entity.setInitiatorName(dto.getInitiatorName());
        entity.setDepartment(dto.getDepartment());
        if (dto.getRequestDate() != null) entity.setRequestDate(dto.getRequestDate());
        entity.setTargetCompletionDate(dto.getTargetCompletionDate());
        entity.setActualCompletionDate(dto.getActualCompletionDate());
        entity.setChangeReason(dto.getChangeReason());
        entity.setCurrentState(dto.getCurrentState());
        entity.setProposedChange(dto.getProposedChange());

        // 영향평가 갱신
        entity.setRegulatoryImpact(dto.getRegulatoryImpact());
        entity.setRegulatoryDetails(dto.getRegulatoryDetails());
        entity.setQualitySafetyImpact(dto.getQualitySafetyImpact());
        entity.setQualityDetails(dto.getQualityDetails());
        entity.setValidationRequired(dto.getValidationRequired());
        entity.setValidationDetails(dto.getValidationDetails());

        // 양방향 추적성 갱신
        entity.setRiskAssessmentId(dto.getRiskAssessmentId());
        entity.setRiskAssessmentCode(dto.getRiskAssessmentCode());
        entity.setDmsDocumentId(dto.getDmsDocumentId());
        entity.setDmsDocumentNumber(dto.getDmsDocumentNumber());
        entity.setDesignProjectId(dto.getDesignProjectId());
        entity.setDesignProjectCode(dto.getDesignProjectCode());

        entity.setEffectivenessRequired(dto.getEffectivenessRequired());
        entity.setEffectivenessDueDate(dto.getEffectivenessDueDate());
        entity.setUpdatedBy(username);

        auditLogService.logAction(username, "UPDATE", "CHANGE_REQUEST: " + entity.getChangeNumber(),
                "변경요청 수정: " + entity.getTitle());
        return ChangeRequestResponse.fromEntity(entity);
    }

    @Transactional
    public void deleteChangeRequest(Long id, String username) {
        ChangeRequest entity = findChangeRequestOrThrow(id);
        entity.setIsDeleted(true);
        entity.setDeletedAt(LocalDateTime.now());
        entity.setUpdatedBy(username);

        auditLogService.logAction(username, "DELETE", "CHANGE_REQUEST: " + entity.getChangeNumber(),
                "변경요청 소프트 삭제: " + entity.getTitle());
        log.warn("[CHANGE CONTROL] Change Request Soft Deleted: {} by {}", entity.getChangeNumber(), username);
    }

    @Transactional
    public ChangeRequestResponse transitionStatus(Long id, ChangeStatus nextStatus, String username) {
        ChangeRequest entity = findChangeRequestOrThrow(id);
        ChangeStatus prev = entity.getStatus();
        entity.setStatus(nextStatus);
        entity.setUpdatedBy(username);

        if (nextStatus == ChangeStatus.CLOSED && entity.getActualCompletionDate() == null) {
            entity.setActualCompletionDate(LocalDate.now());
        }

        auditLogService.logAction(username, "TRANSITION", "CHANGE_REQUEST: " + entity.getChangeNumber(),
                String.format("상태 전이: %s -> %s", prev, nextStatus));
        return ChangeRequestResponse.fromEntity(entity);
    }

    // =========================================================================
    // 2. CCB 심의 및 효과성 평가
    // =========================================================================

    @Transactional
    public ChangeRequestResponse reviewCcb(Long id, CcbReviewRequest dto, String username) {
        ChangeRequest entity = findChangeRequestOrThrow(id);

        entity.setCcbReviewDate(dto.getCcbReviewDate());
        entity.setCcbAttendees(dto.getCcbAttendees());
        entity.setCcbSummary(dto.getCcbSummary());
        entity.setCcbDecision(dto.getCcbDecision());
        entity.setCcbConditions(dto.getCcbConditions());

        // 판정에 따른 상태 자동 전이
        if (dto.getCcbDecision() == CcbDecision.APPROVED || dto.getCcbDecision() == CcbDecision.CONDITIONALLY_APPROVED) {
            entity.setStatus(ChangeStatus.APPROVED);
        } else if (dto.getCcbDecision() == CcbDecision.REJECTED) {
            entity.setStatus(ChangeStatus.REJECTED);
        } else if (dto.getCcbDecision() == CcbDecision.MORE_INFO_REQUIRED) {
            entity.setStatus(ChangeStatus.IMPACT_ASSESSING);
        }
        entity.setUpdatedBy(username);

        auditLogService.logAction(username, "CCB_REVIEW", "CHANGE_REQUEST: " + entity.getChangeNumber(),
                String.format("CCB 심의 판정: %s", dto.getCcbDecision()));
        return ChangeRequestResponse.fromEntity(entity);
    }

    @Transactional
    public ChangeRequestResponse evaluateEffectiveness(Long id, ChangeEffectivenessRequest dto, String username) {
        ChangeRequest entity = findChangeRequestOrThrow(id);

        entity.setEffectivenessEvalDate(dto.getEffectivenessEvalDate());
        entity.setEffectivenessStatus(dto.getEffectivenessStatus());
        entity.setEffectivenessSummary(dto.getEffectivenessSummary());
        entity.setEvaluatorName(dto.getEvaluatorName());

        if (dto.getEffectivenessStatus() == EffectivenessStatus.EFFECTIVE) {
            entity.setStatus(ChangeStatus.CLOSED);
            if (entity.getActualCompletionDate() == null) {
                entity.setActualCompletionDate(LocalDate.now());
            }
        }
        entity.setUpdatedBy(username);

        auditLogService.logAction(username, "EFFECTIVENESS_EVAL", "CHANGE_REQUEST: " + entity.getChangeNumber(),
                String.format("효과성 평가 결과: %s", dto.getEffectivenessStatus()));
        return ChangeRequestResponse.fromEntity(entity);
    }

    // =========================================================================
    // 3. 실행 조치과제 (Change Action Items)
    // =========================================================================

    public List<ChangeActionItemResponse> getActionItems(Long changeRequestId) {
        findChangeRequestOrThrow(changeRequestId);
        return changeActionItemRepository.findByChangeRequestIdAndIsDeletedFalseOrderByActionOrderAsc(changeRequestId)
                .stream()
                .map(ChangeActionItemResponse::fromEntity)
                .toList();
    }

    @Transactional
    public ChangeActionItemResponse addActionItem(Long changeRequestId, ChangeActionItemRequest dto, String username) {
        ChangeRequest cr = findChangeRequestOrThrow(changeRequestId);
        long currentCount = changeActionItemRepository.countByChangeRequestIdAndIsDeletedFalse(changeRequestId);

        ChangeActionItem item = ChangeActionItem.builder()
                .changeRequest(cr)
                .actionOrder(dto.getActionOrder() != null ? dto.getActionOrder() : (int) (currentCount + 1))
                .actionTitle(dto.getActionTitle())
                .actionDetails(dto.getActionDetails())
                .assignedPerson(dto.getAssignedPerson())
                .assignedDepartment(dto.getAssignedDepartment())
                .dueDate(dto.getDueDate())
                .completionDate(dto.getCompletionDate())
                .status(dto.getStatus() != null ? dto.getStatus() : "PENDING")
                .evidenceDocUrl(dto.getEvidenceDocUrl())
                .verificationNotes(dto.getVerificationNotes())
                .isDeleted(false)
                .createdBy(username)
                .updatedBy(username)
                .build();

        ChangeActionItem saved = changeActionItemRepository.save(item);
        auditLogService.logAction(username, "CREATE", "CHANGE_ACTION_ITEM: " + saved.getId(),
                "조치항목 등록: " + saved.getActionTitle() + " (CR: " + cr.getChangeNumber() + ")");
        return ChangeActionItemResponse.fromEntity(saved);
    }

    @Transactional
    public ChangeActionItemResponse updateActionItem(Long changeRequestId, Long itemId, ChangeActionItemRequest dto, String username) {
        findChangeRequestOrThrow(changeRequestId);
        ChangeActionItem item = findActionItemOrThrow(itemId);

        if (dto.getActionOrder() != null) item.setActionOrder(dto.getActionOrder());
        item.setActionTitle(dto.getActionTitle());
        item.setActionDetails(dto.getActionDetails());
        item.setAssignedPerson(dto.getAssignedPerson());
        item.setAssignedDepartment(dto.getAssignedDepartment());
        if (dto.getDueDate() != null) item.setDueDate(dto.getDueDate());
        item.setCompletionDate(dto.getCompletionDate());
        if (dto.getStatus() != null) item.setStatus(dto.getStatus());
        item.setEvidenceDocUrl(dto.getEvidenceDocUrl());
        item.setVerificationNotes(dto.getVerificationNotes());
        item.setUpdatedBy(username);

        auditLogService.logAction(username, "UPDATE", "CHANGE_ACTION_ITEM: " + item.getId(),
                "조치항목 수정: " + item.getActionTitle());
        return ChangeActionItemResponse.fromEntity(item);
    }

    @Transactional
    public void deleteActionItem(Long changeRequestId, Long itemId, String username) {
        findChangeRequestOrThrow(changeRequestId);
        ChangeActionItem item = findActionItemOrThrow(itemId);
        item.setIsDeleted(true);
        item.setUpdatedBy(username);

        auditLogService.logAction(username, "DELETE", "CHANGE_ACTION_ITEM: " + item.getId(),
                "조치항목 삭제: " + item.getActionTitle());
    }

    // =========================================================================
    // 4. 6대 KPI 요약 통계 집계
    // =========================================================================

    public ChangeControlKpiResponse getChangeControlKpis() {
        long total = changeRequestRepository.countByIsDeletedFalse();
        List<ChangeStatus> activeStatuses = List.of(
                ChangeStatus.SUBMITTED,
                ChangeStatus.IMPACT_ASSESSING,
                ChangeStatus.CCB_REVIEW,
                ChangeStatus.APPROVED,
                ChangeStatus.IN_PROGRESS,
                ChangeStatus.EFFECTIVENESS_CHECK
        );
        long active = changeRequestRepository.countByStatusInAndIsDeletedFalse(activeStatuses);
        long ccbPending = changeRequestRepository.countByStatusAndIsDeletedFalse(ChangeStatus.CCB_REVIEW);

        long effectiveClosed = changeRequestRepository.countEffectiveClosedChanges();
        long totalClosed = changeRequestRepository.countTotalClosedChanges();
        double passRate = totalClosed > 0 ? Math.round((effectiveClosed * 100.0 / totalClosed) * 10.0) / 10.0 : 100.0;

        // 카테고리별 집계
        Map<String, Long> categoryMap = new HashMap<>();
        for (ChangeCategory cat : ChangeCategory.values()) {
            categoryMap.put(cat.name(), 0L);
        }
        for (Object[] row : changeRequestRepository.countByCategory()) {
            if (row[0] != null) {
                categoryMap.put(((ChangeCategory) row[0]).name(), (Long) row[1]);
            }
        }

        // 상태별 집계
        Map<String, Long> statusMap = new HashMap<>();
        for (ChangeStatus st : ChangeStatus.values()) {
            statusMap.put(st.name(), 0L);
        }
        for (Object[] row : changeRequestRepository.countByStatus()) {
            if (row[0] != null) {
                statusMap.put(((ChangeStatus) row[0]).name(), (Long) row[1]);
            }
        }

        // 긴급도별 집계
        Map<String, Long> urgencyMap = new HashMap<>();
        for (ChangeUrgency ug : ChangeUrgency.values()) {
            urgencyMap.put(ug.name(), 0L);
        }
        for (Object[] row : changeRequestRepository.countByUrgency()) {
            if (row[0] != null) {
                urgencyMap.put(((ChangeUrgency) row[0]).name(), (Long) row[1]);
            }
        }

        long emergencyCount = urgencyMap.getOrDefault(ChangeUrgency.EMERGENCY.name(), 0L);

        return ChangeControlKpiResponse.builder()
                .totalChanges(total)
                .activeChanges(active)
                .ccbPendingCount(ccbPending)
                .effectivenessPassRate(passRate)
                .emergencyCount(emergencyCount)
                .closedChanges(totalClosed)
                .categoryDistribution(categoryMap)
                .statusDistribution(statusMap)
                .urgencyDistribution(urgencyMap)
                .build();
    }

    // =========================================================================
    // 헬퍼 메서드
    // =========================================================================

    private ChangeRequest findChangeRequestOrThrow(Long id) {
        return changeRequestRepository.findByIdAndIsDeletedFalse(id)
                .orElseThrow(() -> new NoSuchElementException("해당 변경요청서를 찾을 수 없습니다: ID " + id));
    }

    private ChangeActionItem findActionItemOrThrow(Long id) {
        return changeActionItemRepository.findByIdAndIsDeletedFalse(id)
                .orElseThrow(() -> new NoSuchElementException("해당 조치과제를 찾을 수 없습니다: ID " + id));
    }

    private synchronized String generateNextChangeNumber() {
        String yearMonth = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyyMM"));
        long count = changeRequestRepository.countByIsDeletedFalse() + 1;
        String number = String.format("CR-%s-%03d", yearMonth, count);
        while (changeRequestRepository.existsByChangeNumberAndIsDeletedFalse(number)) {
            count++;
            number = String.format("CR-%s-%03d", yearMonth, count);
        }
        return number;
    }
}
