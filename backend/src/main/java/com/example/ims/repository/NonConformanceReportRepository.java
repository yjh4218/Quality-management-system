package com.example.ims.repository;

import com.example.ims.entity.*;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface NonConformanceReportRepository extends JpaRepository<NonConformanceReport, Long> {

    Optional<NonConformanceReport> findByNcrNumber(String ncrNumber);

    Optional<NonConformanceReport> findTopByNcrNumberStartingWithOrderByNcrNumberDesc(String prefix);

    List<NonConformanceReport> findByLotNumber(String lotNumber);

    List<NonConformanceReport> findByLotNumberAndStatusIn(String lotNumber, Collection<NcrStatus> statuses);

    List<NonConformanceReport> findBySourceTypeAndSourceRecordIdAndStatusIn(String sourceType, Long sourceRecordId, Collection<NcrStatus> statuses);

    List<NonConformanceReport> findBySourceRecordIdAndStatusIn(Long sourceRecordId, Collection<NcrStatus> statuses);

    @Query("SELECT n FROM NonConformanceReport n WHERE " +
           "(:keyword IS NULL OR :keyword = '' OR " +
           " LOWER(n.ncrNumber) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           " LOWER(n.title) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           " LOWER(n.productName) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           " LOWER(n.itemCode) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           " LOWER(n.lotNumber) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           " LOWER(n.supplierName) LIKE LOWER(CONCAT('%', :keyword, '%'))) AND " +
           "(:stage IS NULL OR n.stage = :stage) AND " +
           "(:severity IS NULL OR n.severity = :severity) AND " +
           "(:status IS NULL OR n.status = :status) AND " +
           "(:quarantineStatus IS NULL OR n.quarantineStatus = :quarantineStatus) " +
           "ORDER BY n.id DESC")
    Page<NonConformanceReport> searchNcrs(
            @Param("keyword") String keyword,
            @Param("stage") NcrOccurrenceStage stage,
            @Param("severity") NcrSeverity severity,
            @Param("status") NcrStatus status,
            @Param("quarantineStatus") QuarantineStatus quarantineStatus,
            Pageable pageable
    );

    long countByStatusIn(Collection<NcrStatus> statuses);

    long countByQuarantineStatus(QuarantineStatus quarantineStatus);

    long countByDispositionTypeIn(Collection<NcrDispositionType> types);

    long countByCapaRequiredTrueOrCapaStatus(CapaLinkageStatus status);

    long countByStatusAndClosedAtAfter(NcrStatus status, LocalDateTime since);
}
