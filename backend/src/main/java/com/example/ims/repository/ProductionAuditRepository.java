package com.example.ims.repository;

import com.example.ims.entity.ProductionAudit;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface ProductionAuditRepository extends JpaRepository<ProductionAudit, Long> {
    @org.springframework.data.jpa.repository.Query("SELECT a FROM ProductionAudit a WHERE a.isDeleted = false AND EXISTS (SELECT p FROM Product p WHERE p.itemCode = a.itemCode AND p.isMaster = true AND p.active = true)")
    List<ProductionAudit> findByIsDeletedFalse();

    @org.springframework.data.jpa.repository.Query("SELECT a FROM ProductionAudit a WHERE a.isDeleted = false AND a.manufacturerName = :manufacturerName AND EXISTS (SELECT p FROM Product p WHERE p.itemCode = a.itemCode AND p.isMaster = true AND p.active = true)")
    List<ProductionAudit> findByManufacturerNameAndIsDeletedFalseInternal(String manufacturerName);

    @org.springframework.data.jpa.repository.Query("SELECT a FROM ProductionAudit a WHERE a.isDeleted = false AND a.manufacturerName = :manufacturerName AND a.isDisclosed = true AND EXISTS (SELECT p FROM Product p WHERE p.itemCode = a.itemCode AND p.isMaster = true AND p.active = true)")
    List<ProductionAudit> findByManufacturerNameAndIsDisclosedTrueAndIsDeletedFalse(String manufacturerName);

    @org.springframework.data.jpa.repository.Query("SELECT DISTINCT p FROM Product p LEFT JOIN FETCH p.manufacturerInfo WHERE p.active = true AND p.isMaster = true AND NOT EXISTS " +
            "(SELECT a FROM ProductionAudit a WHERE a.itemCode = p.itemCode AND a.isDeleted = false)")
    List<com.example.ims.entity.Product> findPendingProducts();

    @org.springframework.data.jpa.repository.Query("SELECT DISTINCT p FROM Product p LEFT JOIN FETCH p.manufacturerInfo WHERE p.active = true AND p.isMaster = true " +
            "AND (p.manufacturerInfo.name = :manufacturerName OR p.manufacturer = :manufacturerName) " +
            "AND NOT EXISTS (SELECT a FROM ProductionAudit a WHERE a.itemCode = p.itemCode AND a.isDeleted = false)")
    List<com.example.ims.entity.Product> findPendingProductsByManufacturerInternal(String manufacturerName);

    @org.springframework.data.jpa.repository.Query("SELECT DISTINCT p FROM Product p LEFT JOIN FETCH p.manufacturerInfo WHERE p.active = true AND p.isMaster = true " +
            "AND (p.manufacturerInfo.name = :manufacturerName OR p.manufacturer = :manufacturerName) AND p.photoAuditDisclosed = true " +
            "AND NOT EXISTS (SELECT a FROM ProductionAudit a WHERE a.itemCode = p.itemCode AND a.isDeleted = false)")
    List<com.example.ims.entity.Product> findPendingProductsByManufacturerAndIsDisclosedTrue(String manufacturerName);

    // Dashboard Queries
    List<ProductionAudit> findTop50ByStatusAndIsDeletedFalseOrderByUploadDateDesc(String status);
    
    List<ProductionAudit> findTop50ByManufacturerNameAndStatusAndIsDisclosedTrueAndIsDeletedFalseOrderByUploadDateDesc(String manufacturerName, String status);

    @org.springframework.data.jpa.repository.Query(value = "SELECT * FROM production_audit WHERE is_deleted = true ORDER BY upload_date DESC", nativeQuery = true)
    List<ProductionAudit> findDeletedAudits();

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.data.jpa.repository.Query(value = "UPDATE production_audit SET is_deleted = false WHERE id = :id", nativeQuery = true)
    void restoreAudit(Long id);
}
