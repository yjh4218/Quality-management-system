package com.example.ims.repository;

import com.example.ims.entity.RiskAssessment;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface RiskAssessmentRepository extends JpaRepository<RiskAssessment, Long> {

    Optional<RiskAssessment> findByAssessmentNo(String assessmentNo);

    boolean existsByAssessmentNo(String assessmentNo);

    @Query("SELECT r FROM RiskAssessment r WHERE " +
           "(:keyword IS NULL OR :keyword = '' OR " +
           "LOWER(r.assessmentNo) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           "LOWER(r.title) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           "LOWER(r.productName) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           "LOWER(r.author) LIKE LOWER(CONCAT('%', :keyword, '%'))) AND " +
           "(:targetFamily IS NULL OR :targetFamily = '' OR r.targetFamily = :targetFamily) AND " +
           "(:riskPhase IS NULL OR :riskPhase = '' OR r.riskPhase = :riskPhase) AND " +
           "(:status IS NULL OR :status = '' OR r.status = :status) " +
           "ORDER BY r.assessmentDate DESC, r.id DESC")
    Page<RiskAssessment> searchAssessments(@Param("keyword") String keyword,
                                          @Param("targetFamily") String targetFamily,
                                          @Param("riskPhase") String riskPhase,
                                          @Param("status") String status,
                                          Pageable pageable);

    long countByStatus(String status);

    @Query("SELECT r.status, COUNT(r) FROM RiskAssessment r GROUP BY r.status")
    List<Object[]> countByStatusGroup();

    @Query("SELECT r.riskPhase, COUNT(r) FROM RiskAssessment r GROUP BY r.riskPhase")
    List<Object[]> countByRiskPhaseGroup();
}
