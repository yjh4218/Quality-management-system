package com.example.ims.service;

import com.example.ims.dto.RiskAssessmentRequest;
import com.example.ims.dto.RiskAssessmentResponse;
import com.example.ims.dto.RiskHazardItemRequest;
import com.example.ims.dto.RiskKpiResponse;
import com.example.ims.entity.RiskAssessment;
import com.example.ims.entity.RiskHazardItem;
import com.example.ims.event.EntityChangeEvent;
import com.example.ims.repository.RiskAssessmentRepository;
import com.example.ims.repository.RiskHazardItemRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

/**
 * ⚠️ ISO 14971:2019 위험관리 (Risk Management) 서비스.
 * 위해요인(Hazard)-위해상황-피해 3계층 식별, FMEA 통제 조치 및 잔여위험 수용성 평가 관리.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class RiskAssessmentService {

    private final RiskAssessmentRepository assessmentRepository;
    private final RiskHazardItemRepository hazardItemRepository;
    private final ApplicationEventPublisher eventPublisher;

    // =========================================================================
    // 1. 위험성 평가 파일 (Risk Assessment) CRUD
    // =========================================================================

    @Transactional(readOnly = true)
    public Page<RiskAssessmentResponse> getAssessments(String keyword, String targetFamily, String riskPhase, String status, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "assessmentDate", "id"));
        Page<RiskAssessment> result = assessmentRepository.searchAssessments(
                (keyword != null && !keyword.isBlank()) ? keyword.trim() : null,
                (targetFamily != null && !targetFamily.isBlank()) ? targetFamily.trim() : null,
                (riskPhase != null && !riskPhase.isBlank()) ? riskPhase.trim() : null,
                (status != null && !status.isBlank()) ? status.trim() : null,
                pageable
        );
        return result.map(entity -> RiskAssessmentResponse.fromEntity(entity, false));
    }

    @Transactional(readOnly = true)
    public RiskAssessmentResponse getAssessmentById(Long id) {
        RiskAssessment assessment = assessmentRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않거나 삭제된 위험성 평가 문서입니다. ID: " + id));
        return RiskAssessmentResponse.fromEntity(assessment, true);
    }

    @Transactional
    public RiskAssessmentResponse createAssessment(RiskAssessmentRequest request, String username) {
        String assessmentNo = request.getAssessmentNo();
        if (assessmentNo == null || assessmentNo.isBlank()) {
            assessmentNo = generateAssessmentNo();
        } else {
            assessmentNo = assessmentNo.trim();
            if (assessmentRepository.existsByAssessmentNo(assessmentNo)) {
                throw new IllegalArgumentException("이미 존재하는 평가번호입니다: " + assessmentNo);
            }
        }

        RiskAssessment assessment = RiskAssessment.builder()
                .assessmentNo(assessmentNo)
                .title(request.getTitle().trim())
                .productId(request.getProductId())
                .productCode(request.getProductCode())
                .productName(request.getProductName().trim())
                .targetFamily(request.getTargetFamily() != null ? request.getTargetFamily() : "MEDICAL_DEVICE")
                .riskPhase(request.getRiskPhase() != null ? request.getRiskPhase() : "DESIGN")
                .versionTag(request.getVersionTag() != null ? request.getVersionTag() : "1.0")
                .status(request.getStatus() != null ? request.getStatus() : "DRAFT")
                .author(request.getAuthor() != null ? request.getAuthor() : username)
                .reviewer(request.getReviewer())
                .approver(request.getApprover())
                .assessmentDate(request.getAssessmentDate() != null ? request.getAssessmentDate() : LocalDate.now())
                .approvalDate(request.getApprovalDate())
                .scopeDescription(request.getScopeDescription())
                .overallResidualRiskAcceptable(request.getOverallResidualRiskAcceptable() != null ? request.getOverallResidualRiskAcceptable() : true)
                .overallConclusion(request.getOverallConclusion())
                .createdBy(username)
                .updatedBy(username)
                .build();

        RiskAssessment saved = assessmentRepository.save(assessment);

        eventPublisher.publishEvent(EntityChangeEvent.builder()
                .entityType("RISK_ASSESSMENT")
                .entityId(saved.getId())
                .action("CREATE")
                .modifier(username)
                .modifierUsername(username)
                .description("위험관리 파일 생성: " + saved.getAssessmentNo())
                .newEntity(saved)
                .build());

        log.info(">>>> [RISK MGMT] Created risk assessment: {} by {}", saved.getAssessmentNo(), username);
        return RiskAssessmentResponse.fromEntity(saved, true);
    }

    @Transactional
    public RiskAssessmentResponse updateAssessment(Long id, RiskAssessmentRequest request, String username) {
        RiskAssessment assessment = assessmentRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 위험성 평가 문서입니다. ID: " + id));

        if (request.getAssessmentNo() != null && !request.getAssessmentNo().isBlank()) {
            String newNo = request.getAssessmentNo().trim();
            if (!newNo.equals(assessment.getAssessmentNo())) {
                if (assessmentRepository.existsByAssessmentNo(newNo)) {
                    throw new IllegalArgumentException("이미 존재하는 평가번호입니다: " + newNo);
                }
                assessment.setAssessmentNo(newNo);
            }
        }

        assessment.setTitle(request.getTitle().trim());
        assessment.setProductId(request.getProductId());
        assessment.setProductCode(request.getProductCode());
        assessment.setProductName(request.getProductName().trim());
        if (request.getTargetFamily() != null) assessment.setTargetFamily(request.getTargetFamily());
        if (request.getRiskPhase() != null) assessment.setRiskPhase(request.getRiskPhase());
        if (request.getVersionTag() != null) assessment.setVersionTag(request.getVersionTag());
        if (request.getStatus() != null) assessment.setStatus(request.getStatus());
        if (request.getAuthor() != null) assessment.setAuthor(request.getAuthor());
        assessment.setReviewer(request.getReviewer());
        assessment.setApprover(request.getApprover());
        if (request.getAssessmentDate() != null) assessment.setAssessmentDate(request.getAssessmentDate());
        assessment.setApprovalDate(request.getApprovalDate());
        assessment.setScopeDescription(request.getScopeDescription());
        if (request.getOverallResidualRiskAcceptable() != null) {
            assessment.setOverallResidualRiskAcceptable(request.getOverallResidualRiskAcceptable());
        }
        assessment.setOverallConclusion(request.getOverallConclusion());
        assessment.setUpdatedBy(username);

        RiskAssessment saved = assessmentRepository.save(assessment);

        eventPublisher.publishEvent(EntityChangeEvent.builder()
                .entityType("RISK_ASSESSMENT")
                .entityId(saved.getId())
                .action("UPDATE")
                .modifier(username)
                .modifierUsername(username)
                .description("위험관리 파일 수정: " + saved.getAssessmentNo())
                .newEntity(saved)
                .build());

        log.info(">>>> [RISK MGMT] Updated risk assessment: {} by {}", saved.getAssessmentNo(), username);
        return RiskAssessmentResponse.fromEntity(saved, true);
    }

    @Transactional
    public void deleteAssessment(Long id, String username) {
        RiskAssessment assessment = assessmentRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 위험성 평가 문서입니다. ID: " + id));

        assessment.setIsDeleted(true);
        assessment.setDeletedAt(LocalDateTime.now());
        assessment.setUpdatedBy(username);
        assessmentRepository.save(assessment);

        eventPublisher.publishEvent(EntityChangeEvent.builder()
                .entityType("RISK_ASSESSMENT")
                .entityId(assessment.getId())
                .action("DELETE")
                .modifier(username)
                .modifierUsername(username)
                .description("위험관리 파일 삭제: " + assessment.getAssessmentNo())
                .build());

        log.info(">>>> [RISK MGMT] Soft-deleted risk assessment: {} by {}", assessment.getAssessmentNo(), username);
    }

    @Transactional
    public RiskAssessmentResponse approveAssessment(Long id, String approver, String username) {
        RiskAssessment assessment = assessmentRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 위험성 평가 문서입니다. ID: " + id));

        assessment.setStatus("APPROVED");
        assessment.setApprover(approver != null && !approver.isBlank() ? approver : username);
        assessment.setApprovalDate(LocalDate.now());
        assessment.setUpdatedBy(username);

        RiskAssessment saved = assessmentRepository.save(assessment);

        eventPublisher.publishEvent(EntityChangeEvent.builder()
                .entityType("RISK_ASSESSMENT")
                .entityId(saved.getId())
                .action("APPROVE")
                .modifier(username)
                .modifierUsername(username)
                .description("위험관리 파일 승인 완료: " + saved.getAssessmentNo())
                .newEntity(saved)
                .build());

        log.info(">>>> [RISK MGMT] Approved risk assessment: {} by {}", saved.getAssessmentNo(), username);
        return RiskAssessmentResponse.fromEntity(saved, true);
    }

    // =========================================================================
    // 2. 위해요인 및 FMEA 위험 통제 조치 (Hazard Items)
    // =========================================================================

    @Transactional(readOnly = true)
    public List<RiskHazardItem> getHazardItems(Long assessmentId) {
        return hazardItemRepository.findByAssessmentIdOrderByItemNoAsc(assessmentId);
    }

    @Transactional
    public RiskHazardItem addHazardItem(Long assessmentId, RiskHazardItemRequest request, String username) {
        RiskAssessment assessment = assessmentRepository.findById(assessmentId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 위험성 평가 문서입니다. ID: " + assessmentId));

        String itemNo = request.getItemNo();
        if (itemNo == null || itemNo.isBlank()) {
            long count = hazardItemRepository.countByAssessmentId(assessmentId);
            itemNo = String.format("HAZ-%03d", count + 1);
        }

        RiskHazardItem item = RiskHazardItem.builder()
                .assessment(assessment)
                .itemNo(itemNo)
                .category(request.getCategory() != null ? request.getCategory() : "ELECTRICAL")
                .hazard(request.getHazard().trim())
                .hazardousSituation(request.getHazardousSituation().trim())
                .harm(request.getHarm().trim())
                .initialSeverity(request.getInitialSeverity())
                .initialProbability(request.getInitialProbability())
                .controlCategory(request.getControlCategory() != null ? request.getControlCategory() : "INHERENT_SAFETY")
                .controlMeasures(request.getControlMeasures().trim())
                .controlStatus(request.getControlStatus() != null ? request.getControlStatus() : "COMPLETED")
                .verificationMethod(request.getVerificationMethod())
                .verificationResult(request.getVerificationResult() != null ? request.getVerificationResult() : "PASS")
                .residualSeverity(request.getResidualSeverity())
                .residualProbability(request.getResidualProbability())
                .benefitRiskNeeded(request.getBenefitRiskNeeded() != null ? request.getBenefitRiskNeeded() : false)
                .benefitRiskSummary(request.getBenefitRiskSummary())
                .remarks(request.getRemarks())
                .createdBy(username)
                .updatedBy(username)
                .build();

        item.calculateRiskScores();
        RiskHazardItem saved = hazardItemRepository.save(item);

        log.info(">>>> [RISK MGMT] Added hazard item: {} to assessment: {} by {}", saved.getItemNo(), assessment.getAssessmentNo(), username);
        return saved;
    }

    @Transactional
    public RiskHazardItem updateHazardItem(Long assessmentId, Long hazardId, RiskHazardItemRequest request, String username) {
        RiskHazardItem item = hazardItemRepository.findByAssessmentIdAndId(assessmentId, hazardId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 위해요인 항목입니다. ID: " + hazardId));

        if (request.getItemNo() != null && !request.getItemNo().isBlank()) {
            item.setItemNo(request.getItemNo().trim());
        }
        if (request.getCategory() != null) item.setCategory(request.getCategory());
        item.setHazard(request.getHazard().trim());
        item.setHazardousSituation(request.getHazardousSituation().trim());
        item.setHarm(request.getHarm().trim());
        item.setInitialSeverity(request.getInitialSeverity());
        item.setInitialProbability(request.getInitialProbability());
        if (request.getControlCategory() != null) item.setControlCategory(request.getControlCategory());
        item.setControlMeasures(request.getControlMeasures().trim());
        if (request.getControlStatus() != null) item.setControlStatus(request.getControlStatus());
        item.setVerificationMethod(request.getVerificationMethod());
        if (request.getVerificationResult() != null) item.setVerificationResult(request.getVerificationResult());
        item.setResidualSeverity(request.getResidualSeverity());
        item.setResidualProbability(request.getResidualProbability());
        if (request.getBenefitRiskNeeded() != null) item.setBenefitRiskNeeded(request.getBenefitRiskNeeded());
        item.setBenefitRiskSummary(request.getBenefitRiskSummary());
        item.setRemarks(request.getRemarks());
        item.setUpdatedBy(username);

        item.calculateRiskScores();
        RiskHazardItem saved = hazardItemRepository.save(item);

        log.info(">>>> [RISK MGMT] Updated hazard item: {} in assessment: {} by {}", saved.getItemNo(), assessmentId, username);
        return saved;
    }

    @Transactional
    public void deleteHazardItem(Long assessmentId, Long hazardId, String username) {
        RiskHazardItem item = hazardItemRepository.findByAssessmentIdAndId(assessmentId, hazardId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 위해요인 항목입니다. ID: " + hazardId));

        item.setIsDeleted(true);
        item.setDeletedAt(LocalDateTime.now());
        item.setUpdatedBy(username);
        hazardItemRepository.save(item);

        log.info(">>>> [RISK MGMT] Soft-deleted hazard item: {} from assessment: {} by {}", hazardId, assessmentId, username);
    }

    // =========================================================================
    // 3. 종합 KPI 및 5x5 FMEA 매트릭스 집계
    // =========================================================================

    @Transactional(readOnly = true)
    public RiskKpiResponse getKpiMetrics() {
        long totalAssessments = assessmentRepository.count();
        long totalHazards = hazardItemRepository.count();
        long completedControls = hazardItemRepository.countByControlStatus("COMPLETED") 
                               + hazardItemRepository.countByControlStatus("VERIFIED");
        long unacceptableRisks = hazardItemRepository.countByInitialAcceptability("UNACCEPTABLE");
        long residualAcceptable = hazardItemRepository.countByResidualAcceptability("ACCEPTABLE");

        double residualAcceptableRate = totalHazards > 0 
                ? Math.round(((double) residualAcceptable / totalHazards) * 1000.0) / 10.0 
                : 100.0;

        long pendingReviewCount = assessmentRepository.countByStatus("REVIEW") 
                                + assessmentRepository.countByStatus("DRAFT");

        // 5x5 Matrix Aggregation (Initial vs Residual)
        Map<String, Integer> initialMap = new HashMap<>();
        Map<String, Integer> residualMap = new HashMap<>();

        // Initialize all 25 cells to 0
        for (int s = 1; s <= 5; s++) {
            for (int p = 1; p <= 5; p++) {
                String key = "S" + s + "_P" + p;
                initialMap.put(key, 0);
                residualMap.put(key, 0);
            }
        }

        List<Object[]> initialCounts = hazardItemRepository.countInitialMatrix(null);
        for (Object[] row : initialCounts) {
            Integer s = (Integer) row[0];
            Integer p = (Integer) row[1];
            Long cnt = (Long) row[2];
            if (s != null && p != null && s >= 1 && s <= 5 && p >= 1 && p <= 5) {
                initialMap.put("S" + s + "_P" + p, cnt.intValue());
            }
        }

        List<Object[]> residualCounts = hazardItemRepository.countResidualMatrix(null);
        for (Object[] row : residualCounts) {
            Integer s = (Integer) row[0];
            Integer p = (Integer) row[1];
            Long cnt = (Long) row[2];
            if (s != null && p != null && s >= 1 && s <= 5 && p >= 1 && p <= 5) {
                residualMap.put("S" + s + "_P" + p, cnt.intValue());
            }
        }

        return RiskKpiResponse.builder()
                .totalAssessments(totalAssessments)
                .totalHazards(totalHazards)
                .completedControls(completedControls)
                .unacceptableRisks(unacceptableRisks)
                .residualAcceptableRate(residualAcceptableRate)
                .pendingReviewCount(pendingReviewCount)
                .initialMatrix(initialMap)
                .residualMatrix(residualMap)
                .build();
    }

    private String generateAssessmentNo() {
        String prefix = "RSK-" + LocalDate.now().format(DateTimeFormatter.ofPattern("yyyyMM")) + "-";
        long count = assessmentRepository.count();
        return String.format("%s%03d", prefix, count + 1);
    }
}
