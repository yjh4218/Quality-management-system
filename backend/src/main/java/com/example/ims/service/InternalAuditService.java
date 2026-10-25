package com.example.ims.service;

import com.example.ims.dto.*;
import com.example.ims.entity.*;
import com.example.ims.repository.AuditChecklistRepository;
import com.example.ims.repository.AuditFindingRepository;
import com.example.ims.repository.InternalAuditRepository;
import com.example.ims.repository.ManagementReviewRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class InternalAuditService {

    private final InternalAuditRepository auditRepository;
    private final AuditChecklistRepository checklistRepository;
    private final AuditFindingRepository findingRepository;
    private final ManagementReviewRepository reviewRepository;

    // =========================================================================
    // KPI 집계
    // =========================================================================

    @Transactional(readOnly = true)
    public InternalAuditKpiResponse getInternalAuditKpi() {
        int currentYear = LocalDate.now().getYear();
        LocalDate yearStart = LocalDate.of(currentYear, 1, 1);
        LocalDate yearEnd = LocalDate.of(currentYear, 12, 31);

        long plannedAudits = auditRepository.countPlannedAuditsBetween(yearStart, yearEnd);
        if (plannedAudits == 0) {
            plannedAudits = auditRepository.countActiveAudits();
        }
        long completedAudits = auditRepository.countCompletedAuditsBetween(yearStart, yearEnd);
        if (completedAudits == 0) {
            completedAudits = auditRepository.countByStatus(AuditStatus.CLOSED);
        }
        double executionRate = plannedAudits > 0 ? Math.round(((double) completedAudits / plannedAudits) * 1000.0) / 10.0 : 0.0;
        long inProgressAudits = auditRepository.countByStatus(AuditStatus.IN_PROGRESS) + auditRepository.countByStatus(AuditStatus.REPORT_PENDING);

        long openFindings = findingRepository.countOpenFindings();
        long criticalMajorFindings = findingRepository.countOpenCriticalMajorFindings();
        long capaLinkedFindings = findingRepository.countCapaLinkedFindings();

        long approvedReviews = reviewRepository.countApprovedReviewsBetween(yearStart, yearEnd);
        boolean recentReviewApproved = approvedReviews > 0;

        List<ManagementReview> upcoming = reviewRepository.findUpcomingReviews();
        String nextDueDateStr = upcoming.isEmpty() ? null : upcoming.get(0).getNextReviewDueDate() != null ? upcoming.get(0).getNextReviewDueDate().toString() : null;

        return InternalAuditKpiResponse.builder()
                .annualPlannedAudits(plannedAudits)
                .completedAudits(completedAudits)
                .auditExecutionRate(executionRate)
                .inProgressAudits(inProgressAudits)
                .openFindings(openFindings)
                .criticalMajorFindings(criticalMajorFindings)
                .capaLinkedFindings(capaLinkedFindings)
                .recentReviewApproved(recentReviewApproved)
                .nextReviewDueDate(nextDueDateStr)
                .build();
    }

    // =========================================================================
    // 1. 내부심사 계획 및 관리 (Internal Audit)
    // =========================================================================

    @Transactional(readOnly = true)
    public List<InternalAuditResponse> getAllAudits() {
        return auditRepository.findByIsDeletedFalseOrderByPlannedStartDateDesc().stream()
                .map(InternalAuditResponse::fromEntity)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public InternalAuditResponse getAuditById(Long id) {
        InternalAudit audit = auditRepository.findById(id)
                .filter(a -> !a.isDeleted())
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 내부심사 건입니다. ID=" + id));
        return InternalAuditResponse.fromEntity(audit);
    }

    @Transactional
    public InternalAuditResponse createAudit(InternalAuditRequest req, String username) {
        // [ISO 13485 §8.2.4 / ISO 19011 심사원 독립성 가드]
        validateAuditorIndependence(req.getLeadAuditorDepartment(), req.getAuditeeDepartment());

        String datePrefix = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyyMMdd"));
        String uniqueSuffix = UUID.randomUUID().toString().substring(0, 3).toUpperCase();
        String auditNumber = "IA-" + datePrefix + "-" + uniqueSuffix;

        InternalAudit audit = InternalAudit.builder()
                .auditNumber(auditNumber)
                .title(req.getTitle())
                .auditType(req.getAuditType())
                .auditScope(req.getAuditScope())
                .criteria(req.getCriteria() != null ? req.getCriteria() : "ISO 13485:2016, ISO 22716:2007, 의료기기법")
                .plannedStartDate(req.getPlannedStartDate())
                .plannedEndDate(req.getPlannedEndDate())
                .actualStartDate(req.getActualStartDate())
                .actualEndDate(req.getActualEndDate())
                .auditeeDepartment(req.getAuditeeDepartment())
                .auditeeLeadName(req.getAuditeeLeadName())
                .leadAuditorName(req.getLeadAuditorName())
                .leadAuditorDepartment(req.getLeadAuditorDepartment())
                .auditTeamMembers(req.getAuditTeamMembers())
                .status(req.getStatus() != null ? req.getStatus() : AuditStatus.PLANNED)
                .summaryConclusion(req.getSummaryConclusion())
                .approvedBy(req.getApprovedBy())
                .approvedDate(req.getApprovedDate())
                .createdBy(username)
                .lastModifiedBy(username)
                .build();

        InternalAudit saved = auditRepository.save(audit);
        log.info("[AUDIT-CREATED] Registered new internal audit: {} ({}) by {}", saved.getAuditNumber(), saved.getTitle(), username);
        return InternalAuditResponse.fromEntity(saved);
    }

    @Transactional
    public InternalAuditResponse updateAudit(Long id, InternalAuditRequest req, String username) {
        InternalAudit audit = auditRepository.findById(id)
                .filter(a -> !a.isDeleted())
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 내부심사 건입니다. ID=" + id));

        // [심사원 독립성 가드]
        validateAuditorIndependence(req.getLeadAuditorDepartment(), req.getAuditeeDepartment());

        audit.setTitle(req.getTitle());
        audit.setAuditType(req.getAuditType());
        audit.setAuditScope(req.getAuditScope());
        if (req.getCriteria() != null) audit.setCriteria(req.getCriteria());
        audit.setPlannedStartDate(req.getPlannedStartDate());
        audit.setPlannedEndDate(req.getPlannedEndDate());
        audit.setActualStartDate(req.getActualStartDate());
        audit.setActualEndDate(req.getActualEndDate());
        audit.setAuditeeDepartment(req.getAuditeeDepartment());
        audit.setAuditeeLeadName(req.getAuditeeLeadName());
        audit.setLeadAuditorName(req.getLeadAuditorName());
        audit.setLeadAuditorDepartment(req.getLeadAuditorDepartment());
        audit.setAuditTeamMembers(req.getAuditTeamMembers());
        if (req.getStatus() != null) audit.setStatus(req.getStatus());
        audit.setSummaryConclusion(req.getSummaryConclusion());
        audit.setApprovedBy(req.getApprovedBy());
        audit.setApprovedDate(req.getApprovedDate());
        audit.setLastModifiedBy(username);

        InternalAudit updated = auditRepository.save(audit);
        log.info("[AUDIT-UPDATED] Updated internal audit: {} (Status: {}) by {}", updated.getAuditNumber(), updated.getStatus(), username);
        return InternalAuditResponse.fromEntity(updated);
    }

    @Transactional
    public void deleteAudit(Long id, String username) {
        InternalAudit audit = auditRepository.findById(id)
                .filter(a -> !a.isDeleted())
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 내부심사 건입니다. ID=" + id));
        audit.setDeleted(true);
        audit.setLastModifiedBy(username);
        auditRepository.save(audit);
        log.info("[AUDIT-DELETED] Soft deleted internal audit: {} by {}", audit.getAuditNumber(), username);
    }

    // =========================================================================
    // 2. 심사 체크리스트 (Audit Checklist)
    // =========================================================================

    @Transactional(readOnly = true)
    public List<AuditChecklistResponse> getChecklistsByAudit(Long auditId) {
        return checklistRepository.findByInternalAuditIdOrderByIdAsc(auditId).stream()
                .map(AuditChecklistResponse::fromEntity)
                .collect(Collectors.toList());
    }

    @Transactional
    public AuditChecklistResponse createChecklist(AuditChecklistRequest req, String username) {
        InternalAudit audit = auditRepository.findById(req.getInternalAuditId())
                .filter(a -> !a.isDeleted())
                .orElseThrow(() -> new IllegalArgumentException("대상 내부심사를 찾을 수 없습니다. ID=" + req.getInternalAuditId()));

        AuditChecklist checklist = AuditChecklist.builder()
                .internalAudit(audit)
                .clauseNumber(req.getClauseNumber())
                .checkpoint(req.getCheckpoint())
                .auditMethod(req.getAuditMethod())
                .evidenceNotes(req.getEvidenceNotes())
                .result(req.getResult())
                .auditedBy(req.getAuditedBy() != null ? req.getAuditedBy() : username)
                .auditedDate(req.getAuditedDate() != null ? req.getAuditedDate() : LocalDate.now())
                .remarks(req.getRemarks())
                .createdBy(username)
                .lastModifiedBy(username)
                .build();

        AuditChecklist saved = checklistRepository.save(checklist);
        log.info("[CHECKLIST-CREATED] Added checklist item for audit: {} (Clause: {}, Result: {}) by {}", 
                audit.getAuditNumber(), saved.getClauseNumber(), saved.getResult(), username);
        return AuditChecklistResponse.fromEntity(saved);
    }

    @Transactional
    public AuditChecklistResponse updateChecklist(Long id, AuditChecklistRequest req, String username) {
        AuditChecklist checklist = checklistRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 체크리스트 항목입니다. ID=" + id));

        checklist.setClauseNumber(req.getClauseNumber());
        checklist.setCheckpoint(req.getCheckpoint());
        checklist.setAuditMethod(req.getAuditMethod());
        checklist.setEvidenceNotes(req.getEvidenceNotes());
        checklist.setResult(req.getResult());
        checklist.setAuditedBy(req.getAuditedBy());
        checklist.setAuditedDate(req.getAuditedDate());
        checklist.setRemarks(req.getRemarks());
        checklist.setLastModifiedBy(username);

        AuditChecklist updated = checklistRepository.save(checklist);
        return AuditChecklistResponse.fromEntity(updated);
    }

    @Transactional
    public void deleteChecklist(Long id) {
        AuditChecklist checklist = checklistRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 체크리스트 항목입니다. ID=" + id));
        checklistRepository.delete(checklist);
    }

    // =========================================================================
    // 3. 심사 지적사항 (Audit Finding)
    // =========================================================================

    @Transactional(readOnly = true)
    public List<AuditFindingResponse> getAllFindings() {
        return findingRepository.findByIsDeletedFalseOrderByCreatedAtDesc().stream()
                .map(AuditFindingResponse::fromEntity)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<AuditFindingResponse> getFindingsByAudit(Long auditId) {
        return findingRepository.findByInternalAuditIdAndIsDeletedFalseOrderByIdAsc(auditId).stream()
                .map(AuditFindingResponse::fromEntity)
                .collect(Collectors.toList());
    }

    @Transactional
    public AuditFindingResponse createFinding(AuditFindingRequest req, String username) {
        InternalAudit audit = auditRepository.findById(req.getInternalAuditId())
                .filter(a -> !a.isDeleted())
                .orElseThrow(() -> new IllegalArgumentException("대상 내부심사를 찾을 수 없습니다. ID=" + req.getInternalAuditId()));

        AuditChecklist checklist = null;
        if (req.getAuditChecklistId() != null) {
            checklist = checklistRepository.findById(req.getAuditChecklistId()).orElse(null);
        }

        String datePrefix = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyyMMdd"));
        String uniqueSuffix = UUID.randomUUID().toString().substring(0, 3).toUpperCase();
        String findingNumber = "FND-" + datePrefix + "-" + uniqueSuffix;

        FindingStatus initialStatus = req.getStatus() != null ? req.getStatus() : FindingStatus.OPEN;
        // [중대/주요 부적합 종결 가드]
        validateFindingClosingGuard(req.getClassification(), initialStatus, req.getCapaNumber());

        AuditFinding finding = AuditFinding.builder()
                .findingNumber(findingNumber)
                .internalAudit(audit)
                .auditChecklist(checklist)
                .clauseNumber(req.getClauseNumber())
                .classification(req.getClassification())
                .status(initialStatus)
                .findingDetails(req.getFindingDetails())
                .requirementCriteria(req.getRequirementCriteria())
                .auditeeActionPlan(req.getAuditeeActionPlan())
                .actionDueDate(req.getActionDueDate())
                .actionCompletedDate(req.getActionCompletedDate())
                .capaNumber(req.getCapaNumber())
                .verifiedBy(req.getVerifiedBy())
                .verifiedDate(req.getVerifiedDate())
                .verificationNotes(req.getVerificationNotes())
                .createdBy(username)
                .lastModifiedBy(username)
                .build();

        AuditFinding saved = findingRepository.save(finding);
        log.info("[FINDING-CREATED] Registered finding: {} ({}, Classification: {}) for audit: {} by {}",
                saved.getFindingNumber(), saved.getClauseNumber(), saved.getClassification(), audit.getAuditNumber(), username);
        return AuditFindingResponse.fromEntity(saved);
    }

    @Transactional
    public AuditFindingResponse updateFinding(Long id, AuditFindingRequest req, String username) {
        AuditFinding finding = findingRepository.findById(id)
                .filter(f -> !f.isDeleted())
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 지적사항 건입니다. ID=" + id));

        FindingStatus targetStatus = req.getStatus() != null ? req.getStatus() : finding.getStatus();
        // [중대/주요 부적합 종결 가드]
        validateFindingClosingGuard(req.getClassification(), targetStatus, req.getCapaNumber());

        finding.setClauseNumber(req.getClauseNumber());
        finding.setClassification(req.getClassification());
        finding.setStatus(targetStatus);
        finding.setFindingDetails(req.getFindingDetails());
        finding.setRequirementCriteria(req.getRequirementCriteria());
        finding.setAuditeeActionPlan(req.getAuditeeActionPlan());
        finding.setActionDueDate(req.getActionDueDate());
        finding.setActionCompletedDate(req.getActionCompletedDate());
        finding.setCapaNumber(req.getCapaNumber());
        finding.setVerifiedBy(req.getVerifiedBy());
        finding.setVerifiedDate(req.getVerifiedDate());
        finding.setVerificationNotes(req.getVerificationNotes());
        finding.setLastModifiedBy(username);

        AuditFinding updated = findingRepository.save(finding);
        log.info("[FINDING-UPDATED] Updated finding: {} (Status: {}) by {}", updated.getFindingNumber(), updated.getStatus(), username);
        return AuditFindingResponse.fromEntity(updated);
    }

    @Transactional
    public void deleteFinding(Long id, String username) {
        AuditFinding finding = findingRepository.findById(id)
                .filter(f -> !f.isDeleted())
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 지적사항 건입니다. ID=" + id));
        finding.setDeleted(true);
        finding.setLastModifiedBy(username);
        findingRepository.save(finding);
        log.info("[FINDING-DELETED] Soft deleted finding: {} by {}", finding.getFindingNumber(), username);
    }

    // =========================================================================
    // 4. 경영검토 (Management Review)
    // =========================================================================

    @Transactional(readOnly = true)
    public List<ManagementReviewResponse> getAllReviews() {
        return reviewRepository.findByIsDeletedFalseOrderByReviewDateDesc().stream()
                .map(ManagementReviewResponse::fromEntity)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public ManagementReviewResponse getReviewById(Long id) {
        ManagementReview review = reviewRepository.findById(id)
                .filter(r -> !r.isDeleted())
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 경영검토 건입니다. ID=" + id));
        return ManagementReviewResponse.fromEntity(review);
    }

    @Transactional
    public ManagementReviewResponse createReview(ManagementReviewRequest req, String username) {
        String datePrefix = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyyMMdd"));
        String uniqueSuffix = UUID.randomUUID().toString().substring(0, 3).toUpperCase();
        String reviewNumber = "MR-" + datePrefix + "-" + uniqueSuffix;

        ManagementReview review = ManagementReview.builder()
                .reviewNumber(reviewNumber)
                .title(req.getTitle())
                .reviewType(req.getReviewType())
                .reviewDate(req.getReviewDate())
                .chairpersonName(req.getChairpersonName())
                .attendees(req.getAttendees())
                .status(req.getStatus() != null ? req.getStatus() : ManagementReviewStatus.SCHEDULED)
                .auditResultsSummary(req.getAuditResultsSummary())
                .customerFeedbackSummary(req.getCustomerFeedbackSummary())
                .processPerformanceSummary(req.getProcessPerformanceSummary())
                .capaStatusSummary(req.getCapaStatusSummary())
                .previousFollowUpSummary(req.getPreviousFollowUpSummary())
                .regulatoryChangesSummary(req.getRegulatoryChangesSummary())
                .recommendationsSummary(req.getRecommendationsSummary())
                .qmsImprovementDecisions(req.getQmsImprovementDecisions())
                .productImprovementDecisions(req.getProductImprovementDecisions())
                .resourceAllocationDecisions(req.getResourceAllocationDecisions())
                .nextReviewDueDate(req.getNextReviewDueDate())
                .approvedBy(req.getApprovedBy())
                .approvedDate(req.getApprovedDate())
                .minutesFileUrl(req.getMinutesFileUrl())
                .createdBy(username)
                .lastModifiedBy(username)
                .build();

        ManagementReview saved = reviewRepository.save(review);
        log.info("[MR-CREATED] Created management review: {} ({}) by {}", saved.getReviewNumber(), saved.getTitle(), username);
        return ManagementReviewResponse.fromEntity(saved);
    }

    @Transactional
    public ManagementReviewResponse updateReview(Long id, ManagementReviewRequest req, String username) {
        ManagementReview review = reviewRepository.findById(id)
                .filter(r -> !r.isDeleted())
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 경영검토 건입니다. ID=" + id));

        review.setTitle(req.getTitle());
        review.setReviewType(req.getReviewType());
        review.setReviewDate(req.getReviewDate());
        review.setChairpersonName(req.getChairpersonName());
        review.setAttendees(req.getAttendees());
        if (req.getStatus() != null) review.setStatus(req.getStatus());
        review.setAuditResultsSummary(req.getAuditResultsSummary());
        review.setCustomerFeedbackSummary(req.getCustomerFeedbackSummary());
        review.setProcessPerformanceSummary(req.getProcessPerformanceSummary());
        review.setCapaStatusSummary(req.getCapaStatusSummary());
        review.setPreviousFollowUpSummary(req.getPreviousFollowUpSummary());
        review.setRegulatoryChangesSummary(req.getRegulatoryChangesSummary());
        review.setRecommendationsSummary(req.getRecommendationsSummary());
        review.setQmsImprovementDecisions(req.getQmsImprovementDecisions());
        review.setProductImprovementDecisions(req.getProductImprovementDecisions());
        review.setResourceAllocationDecisions(req.getResourceAllocationDecisions());
        review.setNextReviewDueDate(req.getNextReviewDueDate());
        review.setApprovedBy(req.getApprovedBy());
        review.setApprovedDate(req.getApprovedDate());
        review.setMinutesFileUrl(req.getMinutesFileUrl());
        review.setLastModifiedBy(username);

        ManagementReview updated = reviewRepository.save(review);
        log.info("[MR-UPDATED] Updated management review: {} (Status: {}) by {}", updated.getReviewNumber(), updated.getStatus(), username);
        return ManagementReviewResponse.fromEntity(updated);
    }

    @Transactional
    public void deleteReview(Long id, String username) {
        ManagementReview review = reviewRepository.findById(id)
                .filter(r -> !r.isDeleted())
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 경영검토 건입니다. ID=" + id));
        review.setDeleted(true);
        review.setLastModifiedBy(username);
        reviewRepository.save(review);
        log.info("[MR-DELETED] Soft deleted management review: {} by {}", review.getReviewNumber(), username);
    }

    // =========================================================================
    // 유효성 검증 가드 (Regulatory Guards)
    // =========================================================================

    /**
     * [ISO 13485 §8.2.4 / ISO 19011] 심사원 독립성 가드
     * 심사원은 자신이 소속된 부서나 업무를 직접 심사할 수 없음.
     */
    private void validateAuditorIndependence(String leadAuditorDept, String auditeeDept) {
        if (leadAuditorDept != null && auditeeDept != null) {
            String normAuditor = leadAuditorDept.trim().replaceAll("\\s+", "").toLowerCase();
            String normAuditee = auditeeDept.trim().replaceAll("\\s+", "").toLowerCase();
            if (normAuditor.equals(normAuditee)) {
                throw new IllegalArgumentException(
                        "ISO 13485 §8.2.4 및 ISO 19011 규정에 의거하여 심사원은 자신의 소속 부서(" + auditeeDept + ")를 직접 심사할 수 없습니다. 독립된 제3의 심사원을 지정하십시오."
                );
            }
        }
    }

    /**
     * [21 CFR 820.100 / ISO 13485 §8.5.2] 중대/주요 부적합 종결 가드
     * CRITICAL 또는 MAJOR 부적합은 CAPA 연계(발행) 및 조치 검증 없이 종결(CLOSED) 처리할 수 없음.
     */
    private void validateFindingClosingGuard(FindingClassification classification, FindingStatus targetStatus, String capaNumber) {
        if (targetStatus == FindingStatus.CLOSED) {
            if (classification == FindingClassification.CRITICAL || classification == FindingClassification.MAJOR) {
                if (capaNumber == null || capaNumber.trim().isEmpty()) {
                    throw new IllegalStateException(
                            "중대(Critical) 또는 주요(Major) 부적합 지적사항은 시정 및 예방조치(CAPA) 연계 및 조치 완료 검증 없이 종결할 수 없습니다."
                    );
                }
            }
        }
    }
}
