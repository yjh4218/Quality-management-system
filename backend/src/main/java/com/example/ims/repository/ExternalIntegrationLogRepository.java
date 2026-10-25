package com.example.ims.repository;

import com.example.ims.entity.ExternalIntegrationLog;
import com.example.ims.entity.IntegrationStatus;
import com.example.ims.entity.IntegrationSystemType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ExternalIntegrationLogRepository extends JpaRepository<ExternalIntegrationLog, Long> {

    Optional<ExternalIntegrationLog> findByLogNumber(String logNumber);

    @Query("SELECT l FROM ExternalIntegrationLog l WHERE " +
           "(:keyword IS NULL OR :keyword = '' OR " +
           " LOWER(l.logNumber) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           " LOWER(l.targetBatchNumber) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           " LOWER(l.reconciliationNotes) LIKE LOWER(CONCAT('%', :keyword, '%'))) AND " +
           "(:systemType IS NULL OR l.systemType = :systemType) AND " +
           "(:status IS NULL OR l.status = :status) " +
           "ORDER BY l.id DESC")
    Page<ExternalIntegrationLog> searchLogs(
            @Param("keyword") String keyword,
            @Param("systemType") IntegrationSystemType systemType,
            @Param("status") IntegrationStatus status,
            Pageable pageable
    );

    long countByStatus(IntegrationStatus status);
}
