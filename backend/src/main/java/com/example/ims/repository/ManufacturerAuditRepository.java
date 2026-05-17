package com.example.ims.repository;

import com.example.ims.entity.ManufacturerAudit;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.time.LocalDate;
import java.util.List;

public interface ManufacturerAuditRepository extends JpaRepository<ManufacturerAudit, Long> {
    
    @Query("SELECT DISTINCT ma FROM ManufacturerAudit ma " +
           "LEFT JOIN FETCH ma.manufacturer m " +
           "LEFT JOIN FETCH ma.template t " +
           "WHERE (CAST(:startDate AS localdate) IS NULL OR ma.auditDate >= :startDate) " +
           "AND (CAST(:endDate AS localdate) IS NULL OR ma.auditDate <= :endDate) " +
           "AND (:manufacturerName IS NULL OR :manufacturerName = '' OR m.name LIKE %:manufacturerName%) " +
           "AND (:manufacturerCode IS NULL OR :manufacturerCode = '' OR m.manufacturerCode LIKE %:manufacturerCode% OR m.identificationCode LIKE %:manufacturerCode%) " +
           "AND (:grade IS NULL OR :grade = '' OR ma.grade = :grade) " +
           "ORDER BY ma.auditDate DESC, m.manufacturerCode ASC, m.name ASC")
    List<ManufacturerAudit> searchAudits(
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate,
            @Param("manufacturerName") String manufacturerName,
            @Param("manufacturerCode") String manufacturerCode,
            @Param("grade") String grade);

    // [휴지통] 삭제된 항목 조회 (Native Query로 SQLRestriction 우회)
    @org.springframework.data.jpa.repository.Query(value = "SELECT * FROM manufacturer_audits WHERE is_deleted = true ORDER BY updated_at DESC", nativeQuery = true)
    List<ManufacturerAudit> findDeletedAudits();

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.data.jpa.repository.Query(value = "UPDATE manufacturer_audits SET is_deleted = false WHERE id = :id", nativeQuery = true)
    void restoreAudit(Long id);
}
