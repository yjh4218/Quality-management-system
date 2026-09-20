package com.example.ims.repository;

import com.example.ims.entity.CoaRequestLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface CoaRequestLogRepository extends JpaRepository<CoaRequestLog, Long> {

    List<CoaRequestLog> findByInboundId(Long inboundId);

    List<CoaRequestLog> findByInboundIdAndStatusNot(Long inboundId, String status);

    List<CoaRequestLog> findByStatus(String status);

    List<CoaRequestLog> findAllByOrderByRequestedAtDesc();

    @Query("SELECT c FROM CoaRequestLog c WHERE " +
           "(:manufacturer IS NULL OR c.manufacturer LIKE %:manufacturer%) AND " +
           "(:status IS NULL OR c.status = :status) AND " +
           "(:startDate IS NULL OR c.requestedAt >= :startDate) AND " +
           "(:endDate IS NULL OR c.requestedAt <= :endDate) " +
           "ORDER BY c.requestedAt DESC")
    List<CoaRequestLog> searchHistory(
            @Param("manufacturer") String manufacturer,
            @Param("status") String status,
            @Param("startDate") LocalDateTime startDate,
            @Param("endDate") LocalDateTime endDate
    );
}
