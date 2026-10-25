package com.example.ims.service;

import com.example.ims.dto.*;
import com.example.ims.entity.*;
import com.example.ims.repository.ClaimRepository;
import com.example.ims.repository.ComplaintActionItemRepository;
import com.example.ims.repository.ComplaintSafetyEvaluationRepository;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

/**
 * 고객 불만 및 시판 후 이상사례 안전성 평가 서비스
 * ISO 13485:2016 §8.2.2 / ISO 22716:2007 §10 / 21 CFR 820.198
 * Defect Resolution: D-9 해소 (LOT 미상 접수 허용 및 안전성 평가 연계)
 */
@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class ComplaintSafetyService {

    private final ComplaintSafetyEvaluationRepository evaluationRepository;
    private final ComplaintActionItemRepository actionItemRepository;
    private final ClaimRepository claimRepository;

    /**
     * 6개 핵심 KPI 단일 쿼리 집계
     */
    public ComplaintSafetyKpiResponse getKpiSummary() {
        var projection = evaluationRepository.getKpiSummary();
        if (projection == null) {
            return ComplaintSafetyKpiResponse.empty();
        }
        return ComplaintSafetyKpiResponse.builder()
                .totalEvaluations(projection.getTotalEvaluations() != null ? projection.getTotalEvaluations() : 0L)
                .seriousCases(projection.getSeriousCases() != null ? projection.getSeriousCases() : 0L)
                .reportableCases(projection.getReportableCases() != null ? projection.getReportableCases() : 0L)
                .underReviewCases(projection.getUnderReviewCases() != null ? projection.getUnderReviewCases() : 0L)
                .unknownLotCases(projection.getUnknownLotCases() != null ? projection.getUnknownLotCases() : 0L)
                .capaRequiredCases(projection.getCapaRequiredCases() != null ? projection.getCapaRequiredCases() : 0L)
                .build();
    }

    /**
     * 다차원 필터링 검색 및 페이징
     */
    public Page<ComplaintSafetyResponse> searchEvaluations(
            String keyword,
            ProductRegulatoryType productType,
            Boolean isSerious,
            CausalityGrade causalityGrade,
            ReportabilityStatus reportabilityStatus,
            Boolean isLotUnknown,
            ComplaintEvaluationStatus evaluationStatus,
            LocalDate startDate,
            LocalDate endDate,
            Pageable pageable) {

        Specification<ComplaintSafetyEvaluation> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (keyword != null && !keyword.trim().isEmpty()) {
                String pattern = "%" + keyword.trim().toLowerCase() + "%";
                Predicate numMatch = cb.like(cb.lower(root.get("evaluationNumber")), pattern);
                Predicate titleMatch = cb.like(cb.lower(root.get("title")), pattern);
                Predicate prodMatch = cb.like(cb.lower(root.get("productName")), pattern);
                Predicate codeMatch = cb.like(cb.lower(root.get("itemCode")), pattern);
                Predicate custMatch = cb.like(cb.lower(root.get("customerName")), pattern);
                Predicate lotMatch = cb.like(cb.lower(root.get("lotNumber")), pattern);
                predicates.add(cb.or(numMatch, titleMatch, prodMatch, codeMatch, custMatch, lotMatch));
            }

            if (productType != null) {
                predicates.add(cb.equal(root.get("productType"), productType));
            }
            if (isSerious != null) {
                predicates.add(cb.equal(root.get("isSerious"), isSerious));
            }
            if (causalityGrade != null) {
                predicates.add(cb.equal(root.get("causalityGrade"), causalityGrade));
            }
            if (reportabilityStatus != null) {
                predicates.add(cb.equal(root.get("reportabilityStatus"), reportabilityStatus));
            }
            if (isLotUnknown != null) {
                predicates.add(cb.equal(root.get("isLotUnknown"), isLotUnknown));
            }
            if (evaluationStatus != null) {
                predicates.add(cb.equal(root.get("evaluationStatus"), evaluationStatus));
            }
            if (startDate != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("evaluationDate"), startDate));
            }
            if (endDate != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("evaluationDate"), endDate));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };

        return evaluationRepository.findAll(spec, pageable).map(ComplaintSafetyResponse::from);
    }

    /**
     * 단건 상세 조회
     */
    public ComplaintSafetyResponse getEvaluationById(Long id) {
        ComplaintSafetyEvaluation eval = evaluationRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 안전성 평가 보고서입니다. ID: " + id));
        return ComplaintSafetyResponse.from(eval);
    }

    /**
     * 신규 불만 및 이상사례 안전성 평가 등록 (D-9 LOT 미상 지원)
     */
    @Transactional
    public ComplaintSafetyResponse createEvaluation(ComplaintSafetyCreateRequest req, String currentUsername) {
        // D-9 해소: lotNumber가 null이거나 비어있으면 isLotUnknown 강제 true 설정
        boolean lotUnknown = Boolean.TRUE.equals(req.getIsLotUnknown()) ||
                req.getLotNumber() == null || req.getLotNumber().trim().isEmpty();
        String effectiveLot = lotUnknown ? null : req.getLotNumber().trim();

        // 21 CFR 820.198(b) 검증: 조사를 실시하지 않는 경우 정당한 사유 필수
        if (Boolean.FALSE.equals(req.getInvestigationRequired())) {
            if (req.getNoInvestigationReason() == null || req.getNoInvestigationReason().trim().isEmpty()) {
                throw new IllegalArgumentException("21 CFR 820.198(b) 규정에 따라 원인조사 미실시 시 사유(noInvestigationReason)는 필수입니다.");
            }
        }

        // 중대한 이상사례인 경우 식약처 15일 법정 보고 기한 자동 산출
        LocalDate deadline = null;
        ReportabilityStatus initialReportStatus = ReportabilityStatus.NOT_REPORTABLE;
        if (Boolean.TRUE.equals(req.getIsSerious())) {
            initialReportStatus = ReportabilityStatus.REPORTABLE;
            deadline = req.getEvaluationDate() != null ? req.getEvaluationDate().plusDays(15) : LocalDate.now().plusDays(15);
        }

        String evalNumber = generateEvaluationNumber();

        ComplaintSafetyEvaluation eval = ComplaintSafetyEvaluation.builder()
                .evaluationNumber(evalNumber)
                .claimId(req.getClaimId())
                .claimNumber(req.getClaimNumber())
                .title(req.getTitle())
                .productType(req.getProductType() != null ? req.getProductType() : ProductRegulatoryType.COSMETIC)
                .itemCode(req.getItemCode())
                .productName(req.getProductName())
                .lotNumber(effectiveLot)
                .isLotUnknown(lotUnknown)
                .manufacturer(req.getManufacturer())
                .receiptDate(req.getReceiptDate() != null ? req.getReceiptDate() : LocalDate.now())
                .evaluatorName(req.getEvaluatorName())
                .evaluationDate(req.getEvaluationDate() != null ? req.getEvaluationDate() : LocalDate.now())
                .customerName(req.getCustomerName())
                .customerContact(req.getCustomerContact())
                .patientAge(req.getPatientAge())
                .patientGender(req.getPatientGender() != null ? req.getPatientGender() : "UNKNOWN")
                .adverseEventCategory(req.getAdverseEventCategory())
                .symptomDescription(req.getSymptomDescription())
                .onsetDays(req.getOnsetDays() != null ? req.getOnsetDays() : 0)
                .medicalTreatmentGiven(Boolean.TRUE.equals(req.getMedicalTreatmentGiven()))
                .treatmentDetails(req.getTreatmentDetails())
                .isSerious(Boolean.TRUE.equals(req.getIsSerious()))
                .seriousReason(req.getSeriousReason())
                .causalityGrade(CausalityGrade.EVALUATING)
                .reportabilityStatus(initialReportStatus)
                .reportDeadline(deadline)
                .investigationRequired(req.getInvestigationRequired() == null || req.getInvestigationRequired())
                .noInvestigationReason(req.getNoInvestigationReason())
                .evaluationStatus(ComplaintEvaluationStatus.SUBMITTED)
                .createdBy(currentUsername)
                .updatedBy(currentUsername)
                .build();

        ComplaintSafetyEvaluation saved = evaluationRepository.save(eval);

        // 연동된 Claim이 존재하면 Claim 엔티티의 안전성 평가 정보 상호 동기화
        if (req.getClaimId() != null) {
            claimRepository.findById(req.getClaimId()).ifPresent(claim -> {
                claim.setSafetyEvalRequired(true);
                claim.setSafetyEvaluationId(saved.getId());
                if (lotUnknown) {
                    claim.setIsLotUnknown(true);
                }
                claimRepository.save(claim);
                log.info(">>>> [COMPLAINT-SAFETY] Linked Claim #{} with SafetyEvaluation #{}", claim.getId(), saved.getEvaluationNumber());
            });
        }

        return ComplaintSafetyResponse.from(saved);
    }

    /**
     * 기존 클레임으로부터 원클릭 안전성 평가 초안 생성
     */
    @Transactional
    public ComplaintSafetyResponse createFromClaim(Long claimId, String currentUsername) {
        Claim claim = claimRepository.findById(claimId)
                .orElseThrow(() -> new IllegalArgumentException("연계 대상 클레임이 존재하지 않습니다. ID: " + claimId));

        boolean lotUnknown = Boolean.TRUE.equals(claim.getIsLotUnknown()) ||
                claim.getLotNumber() == null || claim.getLotNumber().trim().isEmpty() ||
                "LOT-미상".equalsIgnoreCase(claim.getLotNumber().trim()) ||
                "UNKNOWN".equalsIgnoreCase(claim.getLotNumber().trim());

        ComplaintSafetyCreateRequest req = ComplaintSafetyCreateRequest.builder()
                .claimId(claim.getId())
                .claimNumber(claim.getClaimNumber())
                .title("[클레임 연계] " + claim.getProductName() + " 고객 불만 및 안전성 평가")
                .productType(ProductRegulatoryType.COSMETIC)
                .itemCode(claim.getItemCode())
                .productName(claim.getProductName())
                .lotNumber(lotUnknown ? null : claim.getLotNumber())
                .isLotUnknown(lotUnknown)
                .manufacturer(claim.getManufacturer())
                .receiptDate(claim.getReceiptDate() != null ? claim.getReceiptDate() : LocalDate.now())
                .evaluatorName(currentUsername != null ? currentUsername : "품질안전담당")
                .evaluationDate(LocalDate.now())
                .adverseEventCategory(AdverseEventCategory.OTHER)
                .symptomDescription(claim.getClaimContent() != null ? claim.getClaimContent() : "클레임 내용 기반 안전성 검토")
                .onsetDays(0)
                .medicalTreatmentGiven(false)
                .isSerious(Boolean.TRUE.equals(claim.getIsCriticalClaim()))
                .seriousReason(Boolean.TRUE.equals(claim.getIsCriticalClaim()) ? "중대 클레임 지정 건" : null)
                .investigationRequired(true)
                .build();

        return createEvaluation(req, currentUsername);
    }

    /**
     * WHO-UMC 인과관계 평가 및 심의 의결
     */
    @Transactional
    public ComplaintSafetyResponse evaluateCausality(Long id, ComplaintCausalityEvaluationRequest req, String currentUsername) {
        ComplaintSafetyEvaluation eval = evaluationRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 안전성 평가 보고서입니다. ID: " + id));

        eval.setCausalityGrade(req.getCausalityGrade());
        eval.setCausalityRationale(req.getCausalityRationale());

        if (req.getIsSerious() != null) {
            eval.setIsSerious(req.getIsSerious());
            eval.setSeriousReason(req.getSeriousReason());
        }

        if (req.getReportabilityStatus() != null) {
            eval.setReportabilityStatus(req.getReportabilityStatus());
        }
        if (req.getReportDeadline() != null) {
            eval.setReportDeadline(req.getReportDeadline());
        } else if (Boolean.TRUE.equals(eval.getIsSerious()) && eval.getReportDeadline() == null) {
            eval.setReportDeadline(LocalDate.now().plusDays(15));
        }

        // 인과관계가 CERTAIN 또는 PROBABLE이면서 중대한 경우 CAPA 필수화
        if (Boolean.TRUE.equals(req.getCapaRequired()) ||
            (Boolean.TRUE.equals(eval.getIsSerious()) && 
             (req.getCausalityGrade() == CausalityGrade.CERTAIN || req.getCausalityGrade() == CausalityGrade.PROBABLE))) {
            eval.setCapaRequired(true);
            eval.setCapaStatus(CapaLinkageStatus.REQUIRED);
            eval.setCapaRationale(req.getCapaRationale() != null ? req.getCapaRationale() : "인과관계 명확 및 중대 사례로 CAPA 발의 필수");
        } else if (req.getCapaRequired() != null && !req.getCapaRequired()) {
            eval.setCapaRequired(false);
            eval.setCapaStatus(CapaLinkageStatus.NOT_REQUIRED);
        }

        eval.setEvaluationStatus(ComplaintEvaluationStatus.EVALUATED);
        eval.setUpdatedBy(currentUsername);

        return ComplaintSafetyResponse.from(eval);
    }

    /**
     * 식약처 / FDA MDR 규제기관 보고 결과 등록
     */
    @Transactional
    public ComplaintSafetyResponse submitRegulatoryReport(Long id, ComplaintRegulatoryReportRequest req, String currentUsername) {
        ComplaintSafetyEvaluation eval = evaluationRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 안전성 평가 보고서입니다. ID: " + id));

        eval.setReportabilityStatus(req.getReportabilityStatus());
        eval.setAuthorityReportDate(req.getAuthorityReportDate() != null ? req.getAuthorityReportDate() : LocalDate.now());
        eval.setAuthorityReportNumber(req.getAuthorityReportNumber());
        eval.setAuthorityFeedback(req.getAuthorityFeedback());

        if (req.getReportabilityStatus() == ReportabilityStatus.REPORTED) {
            eval.setEvaluationStatus(ComplaintEvaluationStatus.REPORTED);
        }
        eval.setUpdatedBy(currentUsername);

        return ComplaintSafetyResponse.from(eval);
    }

    /**
     * 원인조사 결과 및 16단계 CAPA 연계 등록
     */
    @Transactional
    public ComplaintSafetyResponse recordInvestigation(Long id, ComplaintInvestigationRequest req, String currentUsername) {
        ComplaintSafetyEvaluation eval = evaluationRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 안전성 평가 보고서입니다. ID: " + id));

        // 21 CFR 820.198(b) 검증: 조사 미실시 시 사유 필수
        if (Boolean.FALSE.equals(req.getInvestigationRequired())) {
            if (req.getNoInvestigationReason() == null || req.getNoInvestigationReason().trim().isEmpty()) {
                throw new IllegalArgumentException("21 CFR 820.198(b) 규정에 따라 원인조사 미실시 시 정당한 사유는 필수입니다.");
            }
            eval.setInvestigationRequired(false);
            eval.setNoInvestigationReason(req.getNoInvestigationReason());
        } else {
            eval.setInvestigationRequired(true);
            eval.setInvestigationSummary(req.getInvestigationSummary());
        }

        if (req.getCapaRequired() != null) {
            eval.setCapaRequired(req.getCapaRequired());
            if (req.getCapaRequired()) {
                eval.setCapaStatus(req.getCapaNumber() != null ? CapaLinkageStatus.LINKED : CapaLinkageStatus.REQUIRED);
                eval.setCapaNumber(req.getCapaNumber());
                eval.setCapaRationale(req.getCapaRationale());
            } else {
                eval.setCapaStatus(CapaLinkageStatus.NOT_REQUIRED);
            }
        }

        eval.setUpdatedBy(currentUsername);
        return ComplaintSafetyResponse.from(eval);
    }

    /**
     * 불만 및 이상사례 최종 종결
     */
    @Transactional
    public ComplaintSafetyResponse closeEvaluation(Long id, ComplaintCloseRequest req, String currentUsername) {
        ComplaintSafetyEvaluation eval = evaluationRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 안전성 평가 보고서입니다. ID: " + id));

        // 모든 조치과제가 완료 또는 취소 상태인지 검증
        boolean hasUnfinished = eval.getActionItems().stream()
                .anyMatch(a -> a.getStatus() == NcrActionStatus.PENDING || a.getStatus() == NcrActionStatus.IN_PROGRESS);
        if (hasUnfinished) {
            throw new IllegalStateException("진행 중이거나 대기 중인 후속 조치과제가 존재하여 종결할 수 없습니다. 모든 과제를 완료 처리해주세요.");
        }

        eval.setClosedBy(req.getClosedBy());
        eval.setClosedAt(LocalDateTime.now());
        eval.setClosureRemarks(req.getClosureRemarks());
        eval.setEvaluationStatus(ComplaintEvaluationStatus.CLOSED);
        eval.setUpdatedBy(currentUsername);

        return ComplaintSafetyResponse.from(eval);
    }

    /**
     * 후속 조치과제 (Action Item) 추가
     */
    @Transactional
    public ComplaintActionItemResponse addActionItem(Long evaluationId, ComplaintActionItemRequest req, String currentUsername) {
        ComplaintSafetyEvaluation eval = evaluationRepository.findById(evaluationId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 안전성 평가 보고서입니다. ID: " + evaluationId));

        long count = actionItemRepository.countByEvaluationId(evaluationId) + 1;
        String actionItemNumber = String.format("ACT-%s-%02d", eval.getEvaluationNumber().replace("SAFE-", ""), count);

        ComplaintActionItem item = ComplaintActionItem.builder()
                .evaluation(eval)
                .actionItemNumber(actionItemNumber)
                .actionType(req.getActionType() != null ? req.getActionType() : ComplaintActionType.CUSTOMER_FEEDBACK)
                .title(req.getTitle())
                .description(req.getDescription())
                .assigneeName(req.getAssigneeName())
                .assigneeDept(req.getAssigneeDept())
                .dueDate(req.getDueDate())
                .status(NcrActionStatus.PENDING)
                .verificationResult(VerificationResult.PENDING)
                .createdBy(currentUsername)
                .updatedBy(currentUsername)
                .build();

        ComplaintActionItem saved = actionItemRepository.save(item);
        eval.addActionItem(saved);

        return ComplaintActionItemResponse.from(saved);
    }

    /**
     * 조치과제 완료 및 결과 기록
     */
    @Transactional
    public ComplaintActionItemResponse updateActionItem(Long itemId, ComplaintActionItemRequest req, String currentUsername) {
        ComplaintActionItem item = actionItemRepository.findById(itemId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 조치과제입니다. ID: " + itemId));

        if (req.getTitle() != null) item.setTitle(req.getTitle());
        if (req.getDescription() != null) item.setDescription(req.getDescription());
        if (req.getAssigneeName() != null) item.setAssigneeName(req.getAssigneeName());
        if (req.getAssigneeDept() != null) item.setAssigneeDept(req.getAssigneeDept());
        if (req.getDueDate() != null) item.setDueDate(req.getDueDate());
        if (req.getStatus() != null) item.setStatus(req.getStatus());
        if (req.getActionResult() != null) item.setActionResult(req.getActionResult());
        if (req.getCompletedDate() != null) item.setCompletedDate(req.getCompletedDate());

        if (item.getStatus() == NcrActionStatus.COMPLETED && item.getCompletedDate() == null) {
            item.setCompletedDate(LocalDate.now());
        }

        item.setUpdatedBy(currentUsername);
        return ComplaintActionItemResponse.from(item);
    }

    /**
     * 조치과제 효과성 검증 판정
     */
    @Transactional
    public ComplaintActionItemResponse verifyActionItem(Long itemId, String verifiedBy, VerificationResult result, String currentUsername) {
        ComplaintActionItem item = actionItemRepository.findById(itemId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 조치과제입니다. ID: " + itemId));

        item.setVerifiedBy(verifiedBy);
        item.setVerifiedAt(LocalDateTime.now());
        item.setVerificationResult(result);
        item.setUpdatedBy(currentUsername);

        return ComplaintActionItemResponse.from(item);
    }

    /**
     * 조치과제 삭제
     */
    @Transactional
    public void deleteActionItem(Long itemId) {
        ComplaintActionItem item = actionItemRepository.findById(itemId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 조치과제입니다. ID: " + itemId));
        actionItemRepository.delete(item);
    }

    /**
     * 일련번호 자동 생성: SAFE-yyyyMM-001
     */
    private String generateEvaluationNumber() {
        String prefix = "SAFE-" + LocalDate.now().format(DateTimeFormatter.ofPattern("yyyyMM")) + "-";
        int seq = 1;
        while (true) {
            String candidate = String.format("%s%03d", prefix, seq);
            if (!evaluationRepository.existsByEvaluationNumber(candidate)) {
                return candidate;
            }
            seq++;
        }
    }
}
