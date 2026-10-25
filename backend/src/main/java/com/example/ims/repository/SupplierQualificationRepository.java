package com.example.ims.repository;

import com.example.ims.entity.SupplierApprovalStatus;
import com.example.ims.entity.SupplierGrade;
import com.example.ims.entity.SupplierQualification;
import com.example.ims.entity.SupplierType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SupplierQualificationRepository extends JpaRepository<SupplierQualification, Long> {

    Optional<SupplierQualification> findBySupplierCode(String supplierCode);

    boolean existsBySupplierCode(String supplierCode);

    Optional<SupplierQualification> findTopByOrderBySupplierCodeDesc();

    List<SupplierQualification> findByManufacturerId(Long manufacturerId);

    @Query("SELECT sq FROM SupplierQualification sq " +
           "JOIN FETCH sq.manufacturer m " +
           "WHERE (:status IS NULL OR sq.approvalStatus = :status) " +
           "  AND (:grade IS NULL OR sq.supplierGrade = :grade) " +
           "  AND (:type IS NULL OR sq.supplierType = :type) " +
           "  AND (:keyword IS NULL OR LOWER(sq.supplierCode) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
           "       OR LOWER(m.name) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
           "       OR LOWER(sq.scopeOfSupply) LIKE LOWER(CONCAT('%', :keyword, '%'))) " +
           "ORDER BY sq.id DESC")
    Page<SupplierQualification> searchQualifications(
            @Param("status") SupplierApprovalStatus status,
            @Param("grade") SupplierGrade grade,
            @Param("type") SupplierType type,
            @Param("keyword") String keyword,
            Pageable pageable);

    @Query("SELECT sq.approvalStatus, COUNT(sq) FROM SupplierQualification sq GROUP BY sq.approvalStatus")
    List<Object[]> countByApprovalStatus();

    @Query("SELECT sq.supplierGrade, COUNT(sq) FROM SupplierQualification sq GROUP BY sq.supplierGrade")
    List<Object[]> countBySupplierGrade();

    @Query("SELECT sq.supplierType, COUNT(sq) FROM SupplierQualification sq GROUP BY sq.supplierType")
    List<Object[]> countBySupplierType();

    long countByApprovalStatus(SupplierApprovalStatus status);
}
