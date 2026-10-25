package com.example.ims.repository;

import com.example.ims.entity.EvaluationPeriod;
import com.example.ims.entity.SupplierEvaluation;
import com.example.ims.entity.SupplierGrade;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SupplierEvaluationRepository extends JpaRepository<SupplierEvaluation, Long> {

    List<SupplierEvaluation> findByQualificationIdOrderByEvaluationDateDesc(Long qualificationId);

    @Query("SELECT se FROM SupplierEvaluation se " +
           "JOIN FETCH se.qualification sq " +
           "JOIN FETCH sq.manufacturer m " +
           "WHERE (:qualificationId IS NULL OR sq.id = :qualificationId) " +
           "  AND (:year IS NULL OR se.evaluationYear = :year) " +
           "  AND (:period IS NULL OR se.evaluationPeriod = :period) " +
           "  AND (:grade IS NULL OR se.evaluationGrade = :grade) " +
           "  AND (:keyword IS NULL OR LOWER(sq.supplierCode) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
           "       OR LOWER(m.name) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
           "       OR LOWER(se.evaluatorName) LIKE LOWER(CONCAT('%', :keyword, '%'))) " +
           "ORDER BY se.evaluationDate DESC, se.id DESC")
    Page<SupplierEvaluation> searchEvaluations(
            @Param("qualificationId") Long qualificationId,
            @Param("year") Integer year,
            @Param("period") EvaluationPeriod period,
            @Param("grade") SupplierGrade grade,
            @Param("keyword") String keyword,
            Pageable pageable);

    @Query("SELECT AVG(se.totalScore) FROM SupplierEvaluation se")
    Double calculateAverageTotalScore();

    @Query("SELECT se.evaluationGrade, COUNT(se) FROM SupplierEvaluation se GROUP BY se.evaluationGrade")
    List<Object[]> countByEvaluationGrade();
}
