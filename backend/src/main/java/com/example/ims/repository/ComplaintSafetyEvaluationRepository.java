package com.example.ims.repository;

import com.example.ims.entity.ComplaintSafetyEvaluation;
import com.example.ims.entity.ComplaintEvaluationStatus;
import com.example.ims.entity.ReportabilityStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ComplaintSafetyEvaluationRepository extends JpaRepository<ComplaintSafetyEvaluation, Long>, JpaSpecificationExecutor<ComplaintSafetyEvaluation> {

    Optional<ComplaintSafetyEvaluation> findByEvaluationNumber(String evaluationNumber);

    List<ComplaintSafetyEvaluation> findByClaimId(Long claimId);

    List<ComplaintSafetyEvaluation> findByItemCode(String itemCode);

    List<ComplaintSafetyEvaluation> findByLotNumber(String lotNumber);

    boolean existsByEvaluationNumber(String evaluationNumber);

    // 단일 쿼리 6개 KPI 집계 인터페이스
    @Query("SELECT " +
           "COUNT(e) AS totalEvaluations, " +
           "SUM(CASE WHEN e.isSerious = true THEN 1 ELSE 0 END) AS seriousCases, " +
           "SUM(CASE WHEN e.reportabilityStatus = 'REPORTABLE' OR e.reportabilityStatus = 'REPORTED' THEN 1 ELSE 0 END) AS reportableCases, " +
           "SUM(CASE WHEN e.evaluationStatus = 'UNDER_REVIEW' OR e.causalityGrade = 'EVALUATING' OR e.causalityGrade = 'CONDITIONAL' THEN 1 ELSE 0 END) AS underReviewCases, " +
           "SUM(CASE WHEN e.isLotUnknown = true OR e.lotNumber IS NULL OR TRIM(e.lotNumber) = '' THEN 1 ELSE 0 END) AS unknownLotCases, " +
           "SUM(CASE WHEN e.capaRequired = true THEN 1 ELSE 0 END) AS capaRequiredCases " +
           "FROM ComplaintSafetyEvaluation e")
    ComplaintSafetyKpiProjection getKpiSummary();

    interface ComplaintSafetyKpiProjection {
        Long getTotalEvaluations();
        Long getSeriousCases();
        Long getReportableCases();
        Long getUnderReviewCases();
        Long getUnknownLotCases();
        Long getCapaRequiredCases();
    }
}
