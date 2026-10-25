package com.example.ims.repository;

import com.example.ims.entity.AuditFinding;
import com.example.ims.entity.FindingClassification;
import com.example.ims.entity.FindingStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AuditFindingRepository extends JpaRepository<AuditFinding, Long> {

    Optional<AuditFinding> findByFindingNumberAndIsDeletedFalse(String findingNumber);

    List<AuditFinding> findByIsDeletedFalseOrderByCreatedAtDesc();

    List<AuditFinding> findByInternalAuditIdAndIsDeletedFalseOrderByIdAsc(Long internalAuditId);

    List<AuditFinding> findByClassificationAndIsDeletedFalse(FindingClassification classification);

    List<AuditFinding> findByStatusAndIsDeletedFalse(FindingStatus status);

    List<AuditFinding> findByStatusNotAndIsDeletedFalse(FindingStatus status);

    @Query("SELECT COUNT(f) FROM AuditFinding f WHERE f.isDeleted = false")
    long countTotalFindings();

    @Query("SELECT COUNT(f) FROM AuditFinding f WHERE f.isDeleted = false AND f.status != 'CLOSED'")
    long countOpenFindings();

    @Query("SELECT COUNT(f) FROM AuditFinding f WHERE f.isDeleted = false AND f.classification IN ('CRITICAL', 'MAJOR')")
    long countCriticalAndMajorFindings();

    @Query("SELECT COUNT(f) FROM AuditFinding f WHERE f.isDeleted = false AND f.classification IN ('CRITICAL', 'MAJOR') AND f.status != 'CLOSED'")
    long countOpenCriticalMajorFindings();

    @Query("SELECT COUNT(f) FROM AuditFinding f WHERE f.isDeleted = false AND f.capaNumber IS NOT NULL AND TRIM(f.capaNumber) != ''")
    long countCapaLinkedFindings();
}
