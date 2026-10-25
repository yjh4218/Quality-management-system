package com.example.ims.service;

import com.example.ims.dto.*;
import com.example.ims.entity.*;
import com.example.ims.repository.ProductRecallRepository;
import com.example.ims.repository.VigilanceReportRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class VigilanceRecallService {

    private final VigilanceReportRepository vigilanceRepository;
    private final ProductRecallRepository recallRepository;

    // =========================================================================
    // 1. 규제보고 (Vigilance & MDR) 비즈니스 로직
    // =========================================================================

    @Transactional
    public VigilanceReportResponse createVigilanceReport(VigilanceReportRequest req, String username) {
        String reportNumber = generateVigilanceNumber();

        LocalDate calculatedDueDate = req.getDueDate() != null 
                ? req.getDueDate() 
                : calculateStatutoryDueDate(req.getReportClassification(), req.getAwarenessDate());

        VigilanceSubmissionStatus initialStatus = req.getSubmissionStatus() != null 
                ? req.getSubmissionStatus() 
                : VigilanceSubmissionStatus.DRAFT;

        VigilanceReport entity = VigilanceReport.builder()
                .reportNumber(reportNumber)
                .title(req.getTitle())
                .authorityType(req.getAuthorityType())
                .regulatoryType(req.getRegulatoryType())
                .reportClassification(req.getReportClassification())
                .incidentSeverity(req.getIncidentSeverity())
                .sourceType(req.getSourceType())
                .sourceId(req.getSourceId())
                .sourceNumber(req.getSourceNumber())
                .sourceDescription(req.getSourceDescription())
                .itemCode(req.getItemCode())
                .productName(req.getProductName())
                .lotNumber(req.getLotNumber())
                .isLotUnknown(Boolean.TRUE.equals(req.getIsLotUnknown()))
                .awarenessDate(req.getAwarenessDate())
                .dueDate(calculatedDueDate)
                .submissionDate(req.getSubmissionDate())
                .submissionStatus(initialStatus)
                .authoritySubmissionNumber(req.getAuthoritySubmissionNumber())
                .incidentDescription(req.getIncidentDescription())
                .patientImpact(req.getPatientImpact())
                .preliminaryCausality(req.getPreliminaryCausality())
                .reporterName(req.getReporterName())
                .reportedToDepartment(req.getReportedToDepartment())
                .actionTaken(req.getActionTaken())
                .capaRequired(Boolean.TRUE.equals(req.getCapaRequired()))
                .capaId(req.getCapaId())
                .capaNumber(req.getCapaNumber())
                .isDeleted(false)
                .createdBy(username)
                .updatedBy(username)
                .build();

        VigilanceReport saved = vigilanceRepository.save(entity);
        log.info(">>>> [VIGILANCE-CREATED] Created new vigilance report: {} by {}", reportNumber, username);
        return VigilanceReportResponse.fromEntity(saved);
    }

    @Transactional
    public VigilanceReportResponse updateVigilanceReport(Long id, VigilanceReportRequest req, String username) {
        VigilanceReport report = vigilanceRepository.findById(id)
                .filter(r -> !r.getIsDeleted())
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않거나 삭제된 보고서입니다. (ID: " + id + ")"));

        LocalDate calculatedDueDate = req.getDueDate() != null 
                ? req.getDueDate() 
                : calculateStatutoryDueDate(req.getReportClassification(), req.getAwarenessDate());

        report.setTitle(req.getTitle());
        report.setAuthorityType(req.getAuthorityType());
        report.setRegulatoryType(req.getRegulatoryType());
        report.setReportClassification(req.getReportClassification());
        report.setIncidentSeverity(req.getIncidentSeverity());
        report.setSourceType(req.getSourceType());
        report.setSourceId(req.getSourceId());
        report.setSourceNumber(req.getSourceNumber());
        report.setSourceDescription(req.getSourceDescription());
        report.setItemCode(req.getItemCode());
        report.setProductName(req.getProductName());
        report.setLotNumber(req.getLotNumber());
        report.setIsLotUnknown(Boolean.TRUE.equals(req.getIsLotUnknown()));
        report.setAwarenessDate(req.getAwarenessDate());
        report.setDueDate(calculatedDueDate);

        if (req.getSubmissionDate() != null) {
            report.setSubmissionDate(req.getSubmissionDate());
        }
        if (req.getSubmissionStatus() != null) {
            report.setSubmissionStatus(req.getSubmissionStatus());
        }
        if (req.getAuthoritySubmissionNumber() != null) {
            report.setAuthoritySubmissionNumber(req.getAuthoritySubmissionNumber());
        }

        report.setIncidentDescription(req.getIncidentDescription());
        report.setPatientImpact(req.getPatientImpact());
        report.setPreliminaryCausality(req.getPreliminaryCausality());
        report.setReporterName(req.getReporterName());
        report.setReportedToDepartment(req.getReportedToDepartment());
        report.setActionTaken(req.getActionTaken());
        report.setCapaRequired(Boolean.TRUE.equals(req.getCapaRequired()));
        report.setCapaId(req.getCapaId());
        report.setCapaNumber(req.getCapaNumber());
        report.setUpdatedBy(username);

        log.info(">>>> [VIGILANCE-UPDATED] Updated vigilance report: {} by {}", report.getReportNumber(), username);
        return VigilanceReportResponse.fromEntity(report);
    }

    @Transactional
    public VigilanceReportResponse submitVigilanceReport(Long id, String submissionNumber, LocalDate submissionDate, String username) {
        VigilanceReport report = vigilanceRepository.findById(id)
                .filter(r -> !r.getIsDeleted())
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 보고서입니다. (ID: " + id + ")"));

        report.setSubmissionStatus(VigilanceSubmissionStatus.SUBMITTED);
        report.setAuthoritySubmissionNumber(submissionNumber);
        report.setSubmissionDate(submissionDate != null ? submissionDate : LocalDate.now());
        report.setUpdatedBy(username);

        log.info(">>>> [VIGILANCE-SUBMITTED] Submitted vigilance report: {} (Receipt: {}) by {}", 
                report.getReportNumber(), submissionNumber, username);
        return VigilanceReportResponse.fromEntity(report);
    }

    @Transactional
    public VigilanceReportResponse transitionVigilanceStatus(Long id, VigilanceSubmissionStatus targetStatus, String username) {
        VigilanceReport report = vigilanceRepository.findById(id)
                .filter(r -> !r.getIsDeleted())
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 보고서입니다. (ID: " + id + ")"));

        report.setSubmissionStatus(targetStatus);
        report.setUpdatedBy(username);
        return VigilanceReportResponse.fromEntity(report);
    }

    @Transactional
    public void deleteVigilanceReport(Long id, String username) {
        VigilanceReport report = vigilanceRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 보고서입니다. (ID: " + id + ")"));
        report.setIsDeleted(true);
        report.setUpdatedBy(username);
        log.info(">>>> [VIGILANCE-DELETED] Soft deleted report: {} by {}", report.getReportNumber(), username);
    }

    @Transactional(readOnly = true)
    public VigilanceReportResponse getVigilanceReport(Long id) {
        return vigilanceRepository.findById(id)
                .filter(r -> !r.getIsDeleted())
                .map(VigilanceReportResponse::fromEntity)
                .orElseThrow(() -> new IllegalArgumentException("보고서를 찾을 수 없습니다. (ID: " + id + ")"));
    }

    @Transactional(readOnly = true)
    public List<VigilanceReportResponse> getAllVigilanceReports() {
        return vigilanceRepository.findAllByIsDeletedFalseOrderByCreatedAtDesc().stream()
                .map(VigilanceReportResponse::fromEntity)
                .collect(Collectors.toList());
    }

    // =========================================================================
    // 2. 제품 회수 (Product Recall) & 수량 대사 (Reconciliation) 비즈니스 로직
    // =========================================================================

    @Transactional
    public ProductRecallResponse createRecall(ProductRecallRequest req, String username) {
        String recallNumber = generateRecallNumber();

        RecallStatus initialStatus = req.getStatus() != null ? req.getStatus() : RecallStatus.INITIATED;

        ProductRecall entity = ProductRecall.builder()
                .recallNumber(recallNumber)
                .title(req.getTitle())
                .recallClass(req.getRecallClass())
                .authorityType(req.getAuthorityType())
                .regulatoryType(req.getRegulatoryType())
                .status(initialStatus)
                .itemCode(req.getItemCode())
                .productName(req.getProductName())
                .lotNumber(req.getLotNumber())
                .distributionStartDate(req.getDistributionStartDate())
                .distributionEndDate(req.getDistributionEndDate())
                .initiationDate(req.getInitiationDate())
                .authorityReportDate(req.getAuthorityReportDate())
                .authorityApprovalNumber(req.getAuthorityApprovalNumber())
                .recallReason(req.getRecallReason())
                .healthHazardAssessment(req.getHealthHazardAssessment())
                .shippedQuantity(req.getShippedQuantity() != null ? req.getShippedQuantity() : 0)
                .recalledQuantity(req.getRecalledQuantity() != null ? req.getRecalledQuantity() : 0)
                .quarantinedQuantity(req.getQuarantinedQuantity() != null ? req.getQuarantinedQuantity() : 0)
                .disposedQuantity(req.getDisposedQuantity() != null ? req.getDisposedQuantity() : 0)
                .unretrievedQuantity(req.getUnretrievedQuantity() != null ? req.getUnretrievedQuantity() : 0)
                .disposalMethod(req.getDisposalMethod())
                .disposalDate(req.getDisposalDate())
                .disposalWitness(req.getDisposalWitness())
                .assignedLeader(req.getAssignedLeader())
                .capaId(req.getCapaId())
                .capaNumber(req.getCapaNumber())
                .closureSummary(req.getClosureSummary())
                .isDeleted(false)
                .createdBy(username)
                .updatedBy(username)
                .build();

        entity.calculateRecoveryMetrics();
        ProductRecall saved = recallRepository.save(entity);
        log.info(">>>> [RECALL-CREATED] Created new product recall: {} by {}", recallNumber, username);
        return ProductRecallResponse.fromEntity(saved);
    }

    @Transactional
    public ProductRecallResponse updateRecall(Long id, ProductRecallRequest req, String username) {
        ProductRecall recall = recallRepository.findById(id)
                .filter(r -> !r.getIsDeleted())
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 회수 건입니다. (ID: " + id + ")"));

        recall.setTitle(req.getTitle());
        recall.setRecallClass(req.getRecallClass());
        recall.setAuthorityType(req.getAuthorityType());
        recall.setRegulatoryType(req.getRegulatoryType());
        if (req.getStatus() != null) {
            recall.setStatus(req.getStatus());
        }
        recall.setItemCode(req.getItemCode());
        recall.setProductName(req.getProductName());
        recall.setLotNumber(req.getLotNumber());
        recall.setDistributionStartDate(req.getDistributionStartDate());
        recall.setDistributionEndDate(req.getDistributionEndDate());
        recall.setInitiationDate(req.getInitiationDate());
        recall.setAuthorityReportDate(req.getAuthorityReportDate());
        recall.setAuthorityApprovalNumber(req.getAuthorityApprovalNumber());
        recall.setRecallReason(req.getRecallReason());
        recall.setHealthHazardAssessment(req.getHealthHazardAssessment());

        if (req.getShippedQuantity() != null) recall.setShippedQuantity(req.getShippedQuantity());
        if (req.getRecalledQuantity() != null) recall.setRecalledQuantity(req.getRecalledQuantity());
        if (req.getQuarantinedQuantity() != null) recall.setQuarantinedQuantity(req.getQuarantinedQuantity());
        if (req.getDisposedQuantity() != null) recall.setDisposedQuantity(req.getDisposedQuantity());
        if (req.getUnretrievedQuantity() != null) recall.setUnretrievedQuantity(req.getUnretrievedQuantity());

        recall.setDisposalMethod(req.getDisposalMethod());
        recall.setDisposalDate(req.getDisposalDate());
        recall.setDisposalWitness(req.getDisposalWitness());
        recall.setAssignedLeader(req.getAssignedLeader());
        recall.setCapaId(req.getCapaId());
        recall.setCapaNumber(req.getCapaNumber());
        recall.setClosureSummary(req.getClosureSummary());
        recall.setUpdatedBy(username);

        recall.calculateRecoveryMetrics();
        log.info(">>>> [RECALL-UPDATED] Updated recall: {} by {}", recall.getRecallNumber(), username);
        return ProductRecallResponse.fromEntity(recall);
    }

    @Transactional
    public ProductRecallResponse updateReconciliation(Long id, RecallReconciliationRequest req, String username) {
        ProductRecall recall = recallRepository.findById(id)
                .filter(r -> !r.getIsDeleted())
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 회수 건입니다. (ID: " + id + ")"));

        recall.setShippedQuantity(req.getShippedQuantity());
        recall.setRecalledQuantity(req.getRecalledQuantity());
        recall.setQuarantinedQuantity(req.getQuarantinedQuantity() != null ? req.getQuarantinedQuantity() : 0);
        recall.setDisposedQuantity(req.getDisposedQuantity() != null ? req.getDisposedQuantity() : 0);
        recall.setUnretrievedQuantity(req.getUnretrievedQuantity() != null ? req.getUnretrievedQuantity() : 0);

        if (req.getDisposalMethod() != null) recall.setDisposalMethod(req.getDisposalMethod());
        if (req.getDisposalDate() != null) recall.setDisposalDate(req.getDisposalDate());
        if (req.getDisposalWitness() != null) recall.setDisposalWitness(req.getDisposalWitness());

        recall.setUpdatedBy(username);
        recall.calculateRecoveryMetrics();

        log.info(">>>> [RECALL-RECONCILIATION] Updated reconciliation for recall: {} (Recovery Rate: {}%) by {}",
                recall.getRecallNumber(), recall.getRecoveryRate(), username);
        return ProductRecallResponse.fromEntity(recall);
    }

    /**
     * 회수 상태 전이 및 종결 안전 가드 (Safety Guard)
     * 21 CFR Part 7 / 의료기기법 제34조 규격 준수:
     * COMPLETED 종결 시 출고 총량과 대사 수량(회수+격리+폐기+소비미회수) 합계가 일치해야 함.
     */
    @Transactional
    public ProductRecallResponse transitionRecallStatus(Long id, RecallStatus targetStatus, String notes, String username) {
        ProductRecall recall = recallRepository.findById(id)
                .filter(r -> !r.getIsDeleted())
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 회수 건입니다. (ID: " + id + ")"));

        if (targetStatus == RecallStatus.COMPLETED) {
            int shipped = recall.getShippedQuantity() != null ? recall.getShippedQuantity() : 0;
            int recalled = recall.getRecalledQuantity() != null ? recall.getRecalledQuantity() : 0;
            int quarantined = recall.getQuarantinedQuantity() != null ? recall.getQuarantinedQuantity() : 0;
            int disposed = recall.getDisposedQuantity() != null ? recall.getDisposedQuantity() : 0;
            int unretrieved = recall.getUnretrievedQuantity() != null ? recall.getUnretrievedQuantity() : 0;
            int totalAccounted = recalled + quarantined + disposed + unretrieved;

            if (shipped <= 0) {
                throw new IllegalStateException("출고 수량이 등록되지 않아 회수를 완료 처리할 수 없습니다.");
            }

            if (shipped != totalAccounted) {
                int discrepancy = shipped - totalAccounted;
                throw new IllegalStateException(String.format(
                        "회수 수량 대사가 불일치하여 종결할 수 없습니다. [출고량: %d개, 대사 합계: %d개, 오차: %d개] " +
                        "(규제 가드: 21 CFR Part 7 / 의료기기법 제34조에 따라 미회수 사유 및 수량 대사가 100%% 일치해야 합니다)",
                        shipped, totalAccounted, discrepancy));
            }

            if (notes != null && !notes.isBlank()) {
                recall.setClosureSummary(notes);
            }
            recall.setClosedDate(LocalDate.now());
            recall.setClosedBy(username);
        }

        recall.setStatus(targetStatus);
        recall.setUpdatedBy(username);
        recall.calculateRecoveryMetrics();

        log.info(">>>> [RECALL-STATUS] Transitioned recall: {} to {} by {}", recall.getRecallNumber(), targetStatus, username);
        return ProductRecallResponse.fromEntity(recall);
    }

    @Transactional
    public void deleteRecall(Long id, String username) {
        ProductRecall recall = recallRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 회수 건입니다. (ID: " + id + ")"));
        recall.setIsDeleted(true);
        recall.setUpdatedBy(username);
        log.info(">>>> [RECALL-DELETED] Soft deleted recall: {} by {}", recall.getRecallNumber(), username);
    }

    @Transactional(readOnly = true)
    public ProductRecallResponse getRecall(Long id) {
        return recallRepository.findById(id)
                .filter(r -> !r.getIsDeleted())
                .map(ProductRecallResponse::fromEntity)
                .orElseThrow(() -> new IllegalArgumentException("회수 건을 찾을 수 없습니다. (ID: " + id + ")"));
    }

    @Transactional(readOnly = true)
    public List<ProductRecallResponse> getAllRecalls() {
        return recallRepository.findAllByIsDeletedFalseOrderByCreatedAtDesc().stream()
                .map(ProductRecallResponse::fromEntity)
                .collect(Collectors.toList());
    }

    // =========================================================================
    // 3. 통합 KPI 집계
    // =========================================================================

    @Transactional(readOnly = true)
    public VigilanceRecallKpiResponse getKpiMetrics() {
        LocalDate today = LocalDate.now();
        LocalDate threeDaysLater = today.plusDays(3);

        VigilanceReportRepository.VigilanceKpiProjection vigKpi = vigilanceRepository.getKpiSummary(today, threeDaysLater);
        ProductRecallRepository.RecallKpiProjection recallKpi = recallRepository.getRecallKpiSummary();

        long totalVig = vigKpi != null && vigKpi.getTotalReports() != null ? vigKpi.getTotalReports() : 0L;
        long draftVig = vigKpi != null && vigKpi.getDraftReports() != null ? vigKpi.getDraftReports() : 0L;
        long overdueVig = vigKpi != null && vigKpi.getOverdueReports() != null ? vigKpi.getOverdueReports() : 0L;
        long dueSoonVig = vigKpi != null && vigKpi.getDueSoonReports() != null ? vigKpi.getDueSoonReports() : 0L;
        long submittedVig = vigKpi != null && vigKpi.getSubmittedReports() != null ? vigKpi.getSubmittedReports() : 0L;
        long capaVig = vigKpi != null && vigKpi.getCapaLinkedReports() != null ? vigKpi.getCapaLinkedReports() : 0L;

        long totalRecall = recallKpi != null && recallKpi.getTotalRecalls() != null ? recallKpi.getTotalRecalls() : 0L;
        long activeRecall = recallKpi != null && recallKpi.getActiveRecalls() != null ? recallKpi.getActiveRecalls() : 0L;
        long completedRecall = recallKpi != null && recallKpi.getCompletedRecalls() != null ? recallKpi.getCompletedRecalls() : 0L;
        long class1Recall = recallKpi != null && recallKpi.getClass1Recalls() != null ? recallKpi.getClass1Recalls() : 0L;
        double avgRecovery = recallKpi != null && recallKpi.getAvgRecoveryRate() != null ? recallKpi.getAvgRecoveryRate() : 0.0;

        return VigilanceRecallKpiResponse.builder()
                .totalVigilanceReports(totalVig)
                .draftReports(draftVig)
                .overdueReports(overdueVig)
                .dueSoonReports(dueSoonVig)
                .submittedReports(submittedVig)
                .capaLinkedReports(capaVig)
                .totalRecalls(totalRecall)
                .activeRecalls(activeRecall)
                .completedRecalls(completedRecall)
                .class1Recalls(class1Recall)
                .avgRecoveryRate(Math.round(avgRecovery * 10.0) / 10.0)
                .build();
    }

    // =========================================================================
    // 4. 유틸리티 및 법정 기한 자동 산정 알고리즘
    // =========================================================================

    public LocalDate calculateStatutoryDueDate(VigilanceReportClassification classification, LocalDate awarenessDate) {
        if (awarenessDate == null) {
            awarenessDate = LocalDate.now();
        }
        if (classification == null) {
            return awarenessDate.plusDays(15);
        }

        switch (classification) {
            case EU_MDR_IMMEDIATE_2D:
                return awarenessDate.plusDays(2);
            case FDA_5DAY_MDR:
                return awarenessDate.plusDays(5);
            case MFDS_DEATH_LIFE_THREAT_7D:
                return awarenessDate.plusDays(7);
            case EU_MDR_SERIOUS_10D:
                return awarenessDate.plusDays(10);
            case MFDS_SERIOUS_15D:
            case MFDS_COSMETIC_SERIOUS_15D:
            case EU_MDR_INCIDENT_15D:
                return awarenessDate.plusDays(15);
            case MFDS_GENERAL_30D:
            case FDA_30DAY_MDR:
                return awarenessDate.plusDays(30);
            case MFDS_COSMETIC_QUARTERLY:
                // 분기 종료 후 익월 말일 계산 (Q1->4/30, Q2->7/31, Q3->10/31, Q4->익년 1/31)
                int month = awarenessDate.getMonthValue();
                int year = awarenessDate.getYear();
                if (month <= 3) {
                    return LocalDate.of(year, 4, 30);
                } else if (month <= 6) {
                    return LocalDate.of(year, 7, 31);
                } else if (month <= 9) {
                    return LocalDate.of(year, 10, 31);
                } else {
                    return LocalDate.of(year + 1, 1, 31);
                }
            default:
                return awarenessDate.plusDays(classification.getDefaultDays());
        }
    }

    private synchronized String generateVigilanceNumber() {
        String ym = YearMonth.now().format(DateTimeFormatter.ofPattern("yyyyMM"));
        String prefix = "VIG-" + ym + "-";
        return vigilanceRepository.findTopByReportNumberStartingWithOrderByReportNumberDesc(prefix)
                .map(v -> {
                    String lastSeqStr = v.getReportNumber().substring(prefix.length());
                    int nextSeq = Integer.parseInt(lastSeqStr) + 1;
                    return prefix + String.format("%03d", nextSeq);
                })
                .orElse(prefix + "001");
    }

    private synchronized String generateRecallNumber() {
        String ym = YearMonth.now().format(DateTimeFormatter.ofPattern("yyyyMM"));
        String prefix = "RCL-" + ym + "-";
        return recallRepository.findTopByRecallNumberStartingWithOrderByRecallNumberDesc(prefix)
                .map(r -> {
                    String lastSeqStr = r.getRecallNumber().substring(prefix.length());
                    int nextSeq = Integer.parseInt(lastSeqStr) + 1;
                    return prefix + String.format("%03d", nextSeq);
                })
                .orElse(prefix + "001");
    }
}
