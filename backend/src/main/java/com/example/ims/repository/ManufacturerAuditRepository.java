package com.example.ims.repository;

import com.example.ims.entity.ManufacturerAudit;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.time.LocalDate;
import java.util.List;

public interface ManufacturerAuditRepository extends JpaRepository<ManufacturerAudit, Long> {
    
    @Query("SELECT DISTINCT ma FROM ManufacturerAudit ma " +
           "JOIN FETCH ma.manufacturer " +
           "JOIN FETCH ma.template " +
           "WHERE (:startDate IS NULL OR ma.auditDate >= :startDate) " +
           "AND (:endDate IS NULL OR ma.auditDate <= :endDate) " +
           "AND (:manufacturerName IS NULL OR ma.manufacturer.name LIKE %:manufacturerName%) " +
           "ORDER BY ma.auditDate DESC, ma.manufacturer.manufacturerCode ASC, ma.manufacturer.name ASC")
    List<ManufacturerAudit> searchAudits(
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate,
            @Param("manufacturerName") String manufacturerName);
}
