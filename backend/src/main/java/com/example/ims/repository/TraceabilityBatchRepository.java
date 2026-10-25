package com.example.ims.repository;

import com.example.ims.entity.BatchStage;
import com.example.ims.entity.TraceabilityBatch;
import com.example.ims.entity.TraceabilityQualityStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface TraceabilityBatchRepository extends JpaRepository<TraceabilityBatch, Long> {

    Optional<TraceabilityBatch> findByBatchNumber(String batchNumber);

    List<TraceabilityBatch> findByBatchStage(BatchStage batchStage);

    List<TraceabilityBatch> findByBatchNumberIn(List<String> batchNumbers);

    @Query("SELECT b FROM TraceabilityBatch b WHERE " +
           "(:keyword IS NULL OR :keyword = '' OR " +
           " LOWER(b.batchNumber) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           " LOWER(b.itemName) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           " LOWER(b.itemCode) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           " LOWER(b.supplierOrManufacturer) LIKE LOWER(CONCAT('%', :keyword, '%'))) AND " +
           "(:batchStage IS NULL OR b.batchStage = :batchStage) AND " +
           "(:qualityStatus IS NULL OR b.qualityStatus = :qualityStatus) " +
           "ORDER BY b.id DESC")
    Page<TraceabilityBatch> searchBatches(
            @Param("keyword") String keyword,
            @Param("batchStage") BatchStage batchStage,
            @Param("qualityStatus") TraceabilityQualityStatus qualityStatus,
            Pageable pageable
    );

    long countByBatchStage(BatchStage batchStage);

    long countByQualityStatus(TraceabilityQualityStatus status);
}
