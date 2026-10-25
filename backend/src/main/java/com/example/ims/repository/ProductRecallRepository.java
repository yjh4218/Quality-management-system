package com.example.ims.repository;

import com.example.ims.entity.ProductRecall;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ProductRecallRepository extends JpaRepository<ProductRecall, Long>, JpaSpecificationExecutor<ProductRecall> {

    Optional<ProductRecall> findByRecallNumber(String recallNumber);

    Optional<ProductRecall> findTopByRecallNumberStartingWithOrderByRecallNumberDesc(String prefix);

    List<ProductRecall> findAllByIsDeletedFalseOrderByCreatedAtDesc();

    @Query("""
        SELECT
            COUNT(r) AS totalRecalls,
            SUM(CASE WHEN r.status IN (
                com.example.ims.entity.RecallStatus.INITIATED,
                com.example.ims.entity.RecallStatus.AUTHORITY_NOTIFIED,
                com.example.ims.entity.RecallStatus.CUSTOMER_NOTIFIED,
                com.example.ims.entity.RecallStatus.IN_RECALL,
                com.example.ims.entity.RecallStatus.RECONCILIATION
            ) THEN 1L ELSE 0L END) AS activeRecalls,
            SUM(CASE WHEN r.status = com.example.ims.entity.RecallStatus.COMPLETED THEN 1L ELSE 0L END) AS completedRecalls,
            SUM(CASE WHEN r.recallClass = com.example.ims.entity.RecallClass.CLASS_1 THEN 1L ELSE 0L END) AS class1Recalls,
            AVG(CASE WHEN r.shippedQuantity > 0 THEN r.recoveryRate ELSE 0.0 END) AS avgRecoveryRate
        FROM ProductRecall r
        WHERE r.isDeleted = false
    """)
    RecallKpiProjection getRecallKpiSummary();

    interface RecallKpiProjection {
        Long getTotalRecalls();
        Long getActiveRecalls();
        Long getCompletedRecalls();
        Long getClass1Recalls();
        Double getAvgRecoveryRate();
    }
}
