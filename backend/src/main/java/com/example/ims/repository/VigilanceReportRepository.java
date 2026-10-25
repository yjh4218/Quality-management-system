package com.example.ims.repository;

import com.example.ims.entity.VigilanceReport;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface VigilanceReportRepository extends JpaRepository<VigilanceReport, Long>, JpaSpecificationExecutor<VigilanceReport> {

    Optional<VigilanceReport> findByReportNumber(String reportNumber);

    Optional<VigilanceReport> findTopByReportNumberStartingWithOrderByReportNumberDesc(String prefix);

    List<VigilanceReport> findAllByIsDeletedFalseOrderByCreatedAtDesc();

    @Query("""
        SELECT
            COUNT(v) AS totalReports,
            SUM(CASE WHEN v.submissionStatus = com.example.ims.entity.VigilanceSubmissionStatus.DRAFT THEN 1L ELSE 0L END) AS draftReports,
            SUM(CASE WHEN v.submissionStatus = com.example.ims.entity.VigilanceSubmissionStatus.DRAFT AND v.dueDate < :today THEN 1L ELSE 0L END) AS overdueReports,
            SUM(CASE WHEN v.submissionStatus = com.example.ims.entity.VigilanceSubmissionStatus.DRAFT AND v.dueDate >= :today AND v.dueDate <= :threeDaysLater THEN 1L ELSE 0L END) AS dueSoonReports,
            SUM(CASE WHEN v.submissionStatus IN (com.example.ims.entity.VigilanceSubmissionStatus.SUBMITTED, com.example.ims.entity.VigilanceSubmissionStatus.ACKNOWLEDGED, com.example.ims.entity.VigilanceSubmissionStatus.CLOSED) THEN 1L ELSE 0L END) AS submittedReports,
            SUM(CASE WHEN v.capaRequired = true THEN 1L ELSE 0L END) AS capaLinkedReports
        FROM VigilanceReport v
        WHERE v.isDeleted = false
    """)
    VigilanceKpiProjection getKpiSummary(@Param("today") LocalDate today, @Param("threeDaysLater") LocalDate threeDaysLater);

    interface VigilanceKpiProjection {
        Long getTotalReports();
        Long getDraftReports();
        Long getOverdueReports();
        Long getDueSoonReports();
        Long getSubmittedReports();
        Long getCapaLinkedReports();
    }
}
