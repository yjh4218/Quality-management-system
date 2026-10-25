package com.example.ims.service;

import com.example.ims.dto.*;
import com.example.ims.entity.*;
import com.example.ims.repository.ManufacturerRepository;
import com.example.ims.repository.QualityAgreementRepository;
import com.example.ims.repository.SupplierEvaluationRepository;
import com.example.ims.repository.SupplierQualificationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class SupplierManagementService {

    private final SupplierQualificationRepository qualificationRepository;
    private final SupplierEvaluationRepository evaluationRepository;
    private final QualityAgreementRepository agreementRepository;
    private final ManufacturerRepository manufacturerRepository;
    private final AuditLogService auditLogService;

    // =========================================================================
    // 1. 공급업체 품질 적격성 마스터 (Supplier Qualifications - ASL)
    // =========================================================================

    @Transactional(readOnly = true)
    public Page<SupplierQualificationResponse> searchQualifications(
            SupplierApprovalStatus status,
            SupplierGrade grade,
            SupplierType type,
            String keyword,
            Pageable pageable) {
        return qualificationRepository.searchQualifications(status, grade, type, keyword, pageable)
                .map(SupplierQualificationResponse::fromEntity);
    }

    @Transactional(readOnly = true)
    public SupplierQualificationResponse getQualificationById(Long id) {
        SupplierQualification qual = qualificationRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("해당 공급업체 자격 정보를 찾을 수 없습니다. ID: " + id));
        return SupplierQualificationResponse.fromEntity(qual);
    }

    @Transactional
    public synchronized SupplierQualificationResponse createQualification(SupplierQualificationRequest request, String username) {
        Manufacturer manufacturer = manufacturerRepository.findById(request.getManufacturerId())
                .orElseThrow(() -> new IllegalArgumentException("해당 제조사를 찾을 수 없습니다. ID: " + request.getManufacturerId()));

        String code = request.getSupplierCode();
        if (code == null || code.isBlank()) {
            code = generateNextSupplierCode();
        } else if (qualificationRepository.existsBySupplierCode(code)) {
            throw new IllegalArgumentException("이미 사용 중인 공급업체 식별코드입니다: " + code);
        }

        SupplierQualification qual = SupplierQualification.builder()
                .supplierCode(code)
                .manufacturer(manufacturer)
                .supplierType(request.getSupplierType() != null ? request.getSupplierType() : SupplierType.RAW_MATERIAL)
                .approvalStatus(request.getApprovalStatus() != null ? request.getApprovalStatus() : SupplierApprovalStatus.PENDING_QUALIFICATION)
                .supplierGrade(request.getSupplierGrade() != null ? request.getSupplierGrade() : SupplierGrade.GRADE_B)
                .riskLevel(request.getRiskLevel() != null ? request.getRiskLevel() : "MEDIUM")
                .isoCertifications(request.getIsoCertifications())
                .businessRegistrationNumber(request.getBusinessRegistrationNumber())
                .initialApprovalDate(request.getInitialApprovalDate())
                .lastAuditDate(request.getLastAuditDate())
                .nextEvaluationDate(request.getNextEvaluationDate())
                .scopeOfSupply(request.getScopeOfSupply())
                .qualificationNotes(request.getQualificationNotes())
                .approvedBy(request.getApprovedBy())
                .createdBy(username)
                .updatedBy(username)
                .build();

        SupplierQualification saved = qualificationRepository.save(qual);
        auditLogService.logAction(username, "CREATE", "SUPPLIER_QUALIFICATION: " + saved.getSupplierCode(), "공급업체 적격성 신규 등록: " + saved.getSupplierCode());
        return SupplierQualificationResponse.fromEntity(saved);
    }

    @Transactional
    public SupplierQualificationResponse updateQualification(Long id, SupplierQualificationRequest request, String username) {
        SupplierQualification qual = qualificationRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("해당 공급업체 자격 정보를 찾을 수 없습니다. ID: " + id));

        if (request.getManufacturerId() != null && !request.getManufacturerId().equals(qual.getManufacturer().getId())) {
            Manufacturer manufacturer = manufacturerRepository.findById(request.getManufacturerId())
                    .orElseThrow(() -> new IllegalArgumentException("해당 제조사를 찾을 수 없습니다. ID: " + request.getManufacturerId()));
            qual.setManufacturer(manufacturer);
        }

        if (request.getSupplierType() != null) qual.setSupplierType(request.getSupplierType());
        if (request.getApprovalStatus() != null) qual.setApprovalStatus(request.getApprovalStatus());
        if (request.getSupplierGrade() != null) qual.setSupplierGrade(request.getSupplierGrade());
        if (request.getRiskLevel() != null) qual.setRiskLevel(request.getRiskLevel());
        qual.setIsoCertifications(request.getIsoCertifications());
        qual.setBusinessRegistrationNumber(request.getBusinessRegistrationNumber());
        qual.setInitialApprovalDate(request.getInitialApprovalDate());
        qual.setLastAuditDate(request.getLastAuditDate());
        qual.setNextEvaluationDate(request.getNextEvaluationDate());
        qual.setScopeOfSupply(request.getScopeOfSupply());
        qual.setQualificationNotes(request.getQualificationNotes());
        qual.setApprovedBy(request.getApprovedBy());
        qual.setUpdatedBy(username);

        auditLogService.logAction(username, "UPDATE", "SUPPLIER_QUALIFICATION: " + qual.getSupplierCode(), "공급업체 적격성 정보 수정: " + qual.getSupplierCode());
        return SupplierQualificationResponse.fromEntity(qual);
    }

    @Transactional
    public void deleteQualification(Long id, String username) {
        SupplierQualification qual = qualificationRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("해당 공급업체 자격 정보를 찾을 수 없습니다. ID: " + id));
        qual.setDeleted(true);
        qual.setDeletedAt(LocalDateTime.now());
        qual.setUpdatedBy(username);
        auditLogService.logAction(username, "DELETE", "SUPPLIER_QUALIFICATION: " + qual.getSupplierCode(), "공급업체 적격성 삭제 처리(Soft Delete): " + qual.getSupplierCode());
    }

    @Transactional
    public SupplierQualificationResponse transitionStatus(Long id, SupplierApprovalStatus newStatus, String approvedBy, String username) {
        SupplierQualification qual = qualificationRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("해당 공급업체 자격 정보를 찾을 수 없습니다. ID: " + id));
        qual.setApprovalStatus(newStatus);
        if (approvedBy != null && !approvedBy.isBlank()) {
            qual.setApprovedBy(approvedBy);
        }
        if (newStatus == SupplierApprovalStatus.APPROVED && qual.getInitialApprovalDate() == null) {
            qual.setInitialApprovalDate(LocalDate.now());
        }
        qual.setUpdatedBy(username);
        auditLogService.logAction(username, "STATUS_CHANGE", "SUPPLIER_QUALIFICATION: " + qual.getSupplierCode(), "공급업체 승인상태 변경: " + newStatus);
        return SupplierQualificationResponse.fromEntity(qual);
    }

    private String generateNextSupplierCode() {
        String prefix = "SUP-" + LocalDate.now().format(DateTimeFormatter.ofPattern("yyyyMM")) + "-";
        Optional<SupplierQualification> top = qualificationRepository.findTopByOrderBySupplierCodeDesc();
        int seq = 1;
        if (top.isPresent() && top.get().getSupplierCode() != null && top.get().getSupplierCode().startsWith(prefix)) {
            try {
                String sub = top.get().getSupplierCode().substring(prefix.length());
                seq = Integer.parseInt(sub) + 1;
            } catch (NumberFormatException ignored) {}
        }
        return String.format("%s%03d", prefix, seq);
    }

    // =========================================================================
    // 2. 공급업체 정기 종합평가 (Supplier Performance Evaluations)
    // =========================================================================

    @Transactional(readOnly = true)
    public Page<SupplierEvaluationResponse> searchEvaluations(
            Long qualificationId,
            Integer year,
            EvaluationPeriod period,
            SupplierGrade grade,
            String keyword,
            Pageable pageable) {
        return evaluationRepository.searchEvaluations(qualificationId, year, period, grade, keyword, pageable)
                .map(SupplierEvaluationResponse::fromEntity);
    }

    @Transactional(readOnly = true)
    public List<SupplierEvaluationResponse> getEvaluationsByQualificationId(Long qualificationId) {
        return evaluationRepository.findByQualificationIdOrderByEvaluationDateDesc(qualificationId).stream()
                .map(SupplierEvaluationResponse::fromEntity)
                .toList();
    }

    @Transactional
    public SupplierEvaluationResponse createEvaluation(SupplierEvaluationRequest request, String username) {
        SupplierQualification qual = qualificationRepository.findById(request.getQualificationId())
                .orElseThrow(() -> new IllegalArgumentException("해당 공급업체 자격 정보를 찾을 수 없습니다. ID: " + request.getQualificationId()));

        SupplierEvaluation eval = SupplierEvaluation.builder()
                .qualification(qual)
                .evaluationYear(request.getEvaluationYear())
                .evaluationPeriod(request.getEvaluationPeriod() != null ? request.getEvaluationPeriod() : EvaluationPeriod.ANNUAL)
                .qualityScore(request.getQualityScore())
                .deliveryScore(request.getDeliveryScore())
                .complianceScore(request.getComplianceScore())
                .serviceScore(request.getServiceScore())
                .evaluationDate(request.getEvaluationDate())
                .evaluatorName(request.getEvaluatorName())
                .evaluatorDepartment(request.getEvaluatorDepartment())
                .evaluationSummary(request.getEvaluationSummary())
                .correctiveActionRequired(request.getCorrectiveActionRequired())
                .actionDetails(request.getActionDetails())
                .capaId(request.getCapaId())
                .createdBy(username)
                .updatedBy(username)
                .build();

        eval.calculateTotalAndGrade();
        SupplierEvaluation saved = evaluationRepository.save(eval);

        // 공급업체 마스터의 최근 감사일자 및 등급 자동 동기화
        qual.setSupplierGrade(saved.getEvaluationGrade());
        qual.setLastAuditDate(saved.getEvaluationDate());
        if (saved.getEvaluationGrade() == SupplierGrade.GRADE_D) {
            qual.setApprovalStatus(SupplierApprovalStatus.DISQUALIFIED);
        } else if (saved.getEvaluationGrade() == SupplierGrade.GRADE_C && qual.getApprovalStatus() == SupplierApprovalStatus.APPROVED) {
            qual.setApprovalStatus(SupplierApprovalStatus.CONDITIONALLY_APPROVED);
        }

        auditLogService.logAction(username, "CREATE", "SUPPLIER_EVALUATION: " + qual.getSupplierCode(), 
                String.format("공급업체 종합평가 등록: %d년 %s 총점 %d점 (%s)", 
                        saved.getEvaluationYear(), saved.getEvaluationPeriod(), saved.getTotalScore(), saved.getEvaluationGrade()));
        return SupplierEvaluationResponse.fromEntity(saved);
    }

    @Transactional
    public SupplierEvaluationResponse updateEvaluation(Long id, SupplierEvaluationRequest request, String username) {
        SupplierEvaluation eval = evaluationRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("해당 평가 기록을 찾을 수 없습니다. ID: " + id));

        if (request.getEvaluationYear() != null) eval.setEvaluationYear(request.getEvaluationYear());
        if (request.getEvaluationPeriod() != null) eval.setEvaluationPeriod(request.getEvaluationPeriod());
        if (request.getQualityScore() != null) eval.setQualityScore(request.getQualityScore());
        if (request.getDeliveryScore() != null) eval.setDeliveryScore(request.getDeliveryScore());
        if (request.getComplianceScore() != null) eval.setComplianceScore(request.getComplianceScore());
        if (request.getServiceScore() != null) eval.setServiceScore(request.getServiceScore());
        if (request.getEvaluationDate() != null) eval.setEvaluationDate(request.getEvaluationDate());
        if (request.getEvaluatorName() != null) eval.setEvaluatorName(request.getEvaluatorName());
        eval.setEvaluatorDepartment(request.getEvaluatorDepartment());
        eval.setEvaluationSummary(request.getEvaluationSummary());
        eval.setCorrectiveActionRequired(request.getCorrectiveActionRequired());
        eval.setActionDetails(request.getActionDetails());
        eval.setCapaId(request.getCapaId());
        eval.setUpdatedBy(username);

        eval.calculateTotalAndGrade();

        auditLogService.logAction(username, "UPDATE", "SUPPLIER_EVALUATION: " + eval.getId(), "공급업체 평가 정보 수정: ID " + id);
        return SupplierEvaluationResponse.fromEntity(eval);
    }

    @Transactional
    public void deleteEvaluation(Long id, String username) {
        SupplierEvaluation eval = evaluationRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("해당 평가 기록을 찾을 수 없습니다. ID: " + id));
        eval.setDeleted(true);
        eval.setDeletedAt(LocalDateTime.now());
        eval.setUpdatedBy(username);
        auditLogService.logAction(username, "DELETE", "SUPPLIER_EVALUATION: " + eval.getId(), "공급업체 평가 기록 삭제 처리: ID " + id);
    }

    // =========================================================================
    // 3. 품질협약서 (Quality Assurance Agreement - QAA)
    // =========================================================================

    @Transactional(readOnly = true)
    public Page<QualityAgreementResponse> searchAgreements(
            AgreementStatus status,
            AgreementType type,
            String keyword,
            Pageable pageable) {
        return agreementRepository.searchAgreements(status, type, keyword, pageable)
                .map(QualityAgreementResponse::fromEntity);
    }

    @Transactional(readOnly = true)
    public QualityAgreementResponse getAgreementById(Long id) {
        QualityAgreement agreement = agreementRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("해당 품질협약서를 찾을 수 없습니다. ID: " + id));
        return QualityAgreementResponse.fromEntity(agreement);
    }

    @Transactional
    public synchronized QualityAgreementResponse createAgreement(QualityAgreementRequest request, String username) {
        Manufacturer manufacturer = manufacturerRepository.findById(request.getManufacturerId())
                .orElseThrow(() -> new IllegalArgumentException("해당 제조사를 찾을 수 없습니다. ID: " + request.getManufacturerId()));

        SupplierQualification qualification = null;
        if (request.getQualificationId() != null) {
            qualification = qualificationRepository.findById(request.getQualificationId()).orElse(null);
        }

        String number = request.getAgreementNumber();
        if (number == null || number.isBlank()) {
            number = generateNextAgreementNumber();
        } else if (agreementRepository.existsByAgreementNumber(number)) {
            throw new IllegalArgumentException("이미 사용 중인 품질협약서 번호입니다: " + number);
        }

        QualityAgreement agreement = QualityAgreement.builder()
                .agreementNumber(number)
                .manufacturer(manufacturer)
                .qualification(qualification)
                .title(request.getTitle())
                .agreementType(request.getAgreementType() != null ? request.getAgreementType() : AgreementType.CONTRACT_MANUFACTURING)
                .effectiveDate(request.getEffectiveDate())
                .expiryDate(request.getExpiryDate())
                .retentionExpiryDate(request.getRetentionExpiryDate())
                .autoRenewal(request.getAutoRenewal())
                .renewalNoticeDays(request.getRenewalNoticeDays() != null ? request.getRenewalNoticeDays() : 60)
                .agreementStatus(request.getAgreementStatus() != null ? request.getAgreementStatus() : AgreementStatus.ACTIVE)
                .changeNotificationObligation(request.getChangeNotificationObligation())
                .auditRightsConfirmed(request.getAuditRightsConfirmed())
                .agreementDocUrl(request.getAgreementDocUrl())
                .documentFileName(request.getDocumentFileName())
                .notes(request.getNotes())
                .createdBy(username)
                .updatedBy(username)
                .build();

        agreement.updateStatusByDate(LocalDate.now());
        QualityAgreement saved = agreementRepository.save(agreement);

        auditLogService.logAction(username, "CREATE", "QUALITY_AGREEMENT: " + saved.getAgreementNumber(), "품질보증협약서(QAA) 신규 체결 등록: " + saved.getAgreementNumber());
        return QualityAgreementResponse.fromEntity(saved);
    }

    @Transactional
    public QualityAgreementResponse updateAgreement(Long id, QualityAgreementRequest request, String username) {
        QualityAgreement agreement = agreementRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("해당 품질협약서를 찾을 수 없습니다. ID: " + id));

        if (request.getManufacturerId() != null && !request.getManufacturerId().equals(agreement.getManufacturer().getId())) {
            Manufacturer manufacturer = manufacturerRepository.findById(request.getManufacturerId())
                    .orElseThrow(() -> new IllegalArgumentException("해당 제조사를 찾을 수 없습니다. ID: " + request.getManufacturerId()));
            agreement.setManufacturer(manufacturer);
        }

        if (request.getQualificationId() != null) {
            SupplierQualification qual = qualificationRepository.findById(request.getQualificationId()).orElse(null);
            agreement.setQualification(qual);
        }

        if (request.getTitle() != null) agreement.setTitle(request.getTitle());
        if (request.getAgreementType() != null) agreement.setAgreementType(request.getAgreementType());
        if (request.getEffectiveDate() != null) agreement.setEffectiveDate(request.getEffectiveDate());
        if (request.getExpiryDate() != null) agreement.setExpiryDate(request.getExpiryDate());
        if (request.getRetentionExpiryDate() != null) agreement.setRetentionExpiryDate(request.getRetentionExpiryDate());
        if (request.getAutoRenewal() != null) agreement.setAutoRenewal(request.getAutoRenewal());
        if (request.getRenewalNoticeDays() != null) agreement.setRenewalNoticeDays(request.getRenewalNoticeDays());
        if (request.getAgreementStatus() != null) agreement.setAgreementStatus(request.getAgreementStatus());
        agreement.setChangeNotificationObligation(request.getChangeNotificationObligation());
        agreement.setAuditRightsConfirmed(request.getAuditRightsConfirmed());
        agreement.setAgreementDocUrl(request.getAgreementDocUrl());
        agreement.setDocumentFileName(request.getDocumentFileName());
        agreement.setNotes(request.getNotes());
        agreement.setUpdatedBy(username);

        agreement.updateStatusByDate(LocalDate.now());

        auditLogService.logAction(username, "UPDATE", "QUALITY_AGREEMENT: " + agreement.getAgreementNumber(), "품질보증협약서(QAA) 수정: " + agreement.getAgreementNumber());
        return QualityAgreementResponse.fromEntity(agreement);
    }

    @Transactional
    public void deleteAgreement(Long id, String username) {
        QualityAgreement agreement = agreementRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("해당 품질협약서를 찾을 수 없습니다. ID: " + id));
        agreement.setDeleted(true);
        agreement.setDeletedAt(LocalDateTime.now());
        agreement.setUpdatedBy(username);
        auditLogService.logAction(username, "DELETE", "QUALITY_AGREEMENT: " + agreement.getAgreementNumber(), "품질보증협약서 삭제 처리(Soft Delete): " + agreement.getAgreementNumber());
    }

    private String generateNextAgreementNumber() {
        String prefix = "QAA-" + LocalDate.now().format(DateTimeFormatter.ofPattern("yyyyMM")) + "-";
        Optional<QualityAgreement> top = agreementRepository.findTopByOrderByAgreementNumberDesc();
        int seq = 1;
        if (top.isPresent() && top.get().getAgreementNumber() != null && top.get().getAgreementNumber().startsWith(prefix)) {
            try {
                String sub = top.get().getAgreementNumber().substring(prefix.length());
                seq = Integer.parseInt(sub) + 1;
            } catch (NumberFormatException ignored) {}
        }
        return String.format("%s%03d", prefix, seq);
    }

    // =========================================================================
    // 4. 공급업체 관리 6대 핵심 KPI 통계 단일 쿼리 집계
    // =========================================================================

    @Transactional(readOnly = true)
    public SupplierKpiResponse getSupplierKpis() {
        long totalSuppliers = qualificationRepository.count();
        long approvedSuppliers = qualificationRepository.countByApprovalStatus(SupplierApprovalStatus.APPROVED);
        long conditionalSuppliers = qualificationRepository.countByApprovalStatus(SupplierApprovalStatus.CONDITIONALLY_APPROVED);

        // QAA 준수율: 활성 협약 체결 공급업체 / 전체 공급업체
        long activeMfrCount = agreementRepository.countDistinctActiveManufacturers();
        double qaaComplianceRate = totalSuppliers > 0 
                ? Math.min(100.0, Math.round(((double) activeMfrCount / totalSuppliers) * 1000.0) / 10.0) 
                : 0.0;

        // 30일 이내 만료 예정 QAA 건수
        long expiringSoon = agreementRepository.countExpiringSoon(LocalDate.now().plusDays(30));

        // 평균 공급업체 평가점수
        Double avgScore = evaluationRepository.calculateAverageTotalScore();
        double averageEvaluationScore = avgScore != null ? Math.round(avgScore * 10.0) / 10.0 : 0.0;

        // 상태별 분포
        Map<String, Long> statusDistribution = new HashMap<>();
        for (Object[] row : qualificationRepository.countByApprovalStatus()) {
            if (row[0] != null) {
                statusDistribution.put(row[0].toString(), (Long) row[1]);
            }
        }

        // 등급별 분포
        Map<String, Long> gradeDistribution = new HashMap<>();
        for (Object[] row : qualificationRepository.countBySupplierGrade()) {
            if (row[0] != null) {
                gradeDistribution.put(row[0].toString(), (Long) row[1]);
            }
        }

        // 유형별 분포
        Map<String, Long> typeDistribution = new HashMap<>();
        for (Object[] row : qualificationRepository.countBySupplierType()) {
            if (row[0] != null) {
                typeDistribution.put(row[0].toString(), (Long) row[1]);
            }
        }

        // 협약 상태별 분포
        Map<String, Long> agreementStatusDistribution = new HashMap<>();
        for (Object[] row : agreementRepository.countByAgreementStatus()) {
            if (row[0] != null) {
                agreementStatusDistribution.put(row[0].toString(), (Long) row[1]);
            }
        }

        return SupplierKpiResponse.builder()
                .totalSuppliers(totalSuppliers)
                .approvedSuppliers(approvedSuppliers)
                .conditionalSuppliers(conditionalSuppliers)
                .qaaComplianceRate(qaaComplianceRate)
                .qaaExpiringSoonCount(expiringSoon)
                .averageEvaluationScore(averageEvaluationScore)
                .statusDistribution(statusDistribution)
                .gradeDistribution(gradeDistribution)
                .typeDistribution(typeDistribution)
                .agreementStatusDistribution(agreementStatusDistribution)
                .build();
    }
}
