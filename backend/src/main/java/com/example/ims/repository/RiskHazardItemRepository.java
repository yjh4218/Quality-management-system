package com.example.ims.repository;

import com.example.ims.entity.RiskHazardItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface RiskHazardItemRepository extends JpaRepository<RiskHazardItem, Long> {

    List<RiskHazardItem> findByAssessmentIdOrderByItemNoAsc(Long assessmentId);

    Optional<RiskHazardItem> findByAssessmentIdAndId(Long assessmentId, Long id);

    long countByAssessmentId(Long assessmentId);

    long countByInitialAcceptability(String acceptability);

    long countByResidualAcceptability(String acceptability);

    long countByControlStatus(String controlStatus);

    @Query("SELECT h.initialSeverity, h.initialProbability, COUNT(h) " +
           "FROM RiskHazardItem h " +
           "WHERE (:assessmentId IS NULL OR h.assessment.id = :assessmentId) " +
           "GROUP BY h.initialSeverity, h.initialProbability")
    List<Object[]> countInitialMatrix(@Param("assessmentId") Long assessmentId);

    @Query("SELECT h.residualSeverity, h.residualProbability, COUNT(h) " +
           "FROM RiskHazardItem h " +
           "WHERE (:assessmentId IS NULL OR h.assessment.id = :assessmentId) " +
           "GROUP BY h.residualSeverity, h.residualProbability")
    List<Object[]> countResidualMatrix(@Param("assessmentId") Long assessmentId);
}
