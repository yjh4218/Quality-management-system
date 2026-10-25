package com.example.ims.repository;

import com.example.ims.entity.AuditStatus;
import com.example.ims.entity.AuditType;
import com.example.ims.entity.InternalAudit;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface InternalAuditRepository extends JpaRepository<InternalAudit, Long> {

    Optional<InternalAudit> findByAuditNumberAndIsDeletedFalse(String auditNumber);

    List<InternalAudit> findByIsDeletedFalseOrderByPlannedStartDateDesc();

    List<InternalAudit> findByStatusAndIsDeletedFalse(AuditStatus status);

    List<InternalAudit> findByAuditTypeAndIsDeletedFalse(AuditType auditType);

    List<InternalAudit> findByAuditeeDepartmentAndIsDeletedFalse(String auditeeDepartment);

    @Query("SELECT COUNT(a) FROM InternalAudit a WHERE a.isDeleted = false")
    long countActiveAudits();

    @Query("SELECT COUNT(a) FROM InternalAudit a WHERE a.isDeleted = false AND a.status = :status")
    long countByStatus(AuditStatus status);

    @Query("SELECT COUNT(a) FROM InternalAudit a WHERE a.isDeleted = false AND a.plannedStartDate BETWEEN :start AND :end")
    long countPlannedAuditsBetween(LocalDate start, LocalDate end);

    @Query("SELECT COUNT(a) FROM InternalAudit a WHERE a.isDeleted = false AND a.status = 'CLOSED' AND a.actualEndDate BETWEEN :start AND :end")
    long countCompletedAuditsBetween(LocalDate start, LocalDate end);
}
