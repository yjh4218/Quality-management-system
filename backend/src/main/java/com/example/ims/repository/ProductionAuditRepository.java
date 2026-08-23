package com.example.ims.repository;

import com.example.ims.entity.ProductionAudit;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ProductionAuditRepository extends JpaRepository<ProductionAudit, Long> {
    java.util.Optional<ProductionAudit> findByItemCode(String itemCode);

    @org.springframework.data.jpa.repository.Query("SELECT a FROM ProductionAudit a WHERE (a.deleted = false OR a.deleted IS NULL) AND EXISTS (SELECT p FROM Product p WHERE p.itemCode = a.itemCode AND p.active = true)")
    List<ProductionAudit> findByIsDeletedFalse();

    @org.springframework.data.jpa.repository.Query("SELECT a FROM ProductionAudit a WHERE (a.deleted = false OR a.deleted IS NULL) AND TRIM(a.manufacturerName) = TRIM(:manufacturerName) AND EXISTS (SELECT p FROM Product p WHERE p.itemCode = a.itemCode AND p.active = true)")
    List<ProductionAudit> findByManufacturerNameAndIsDeletedFalseInternal(String manufacturerName);

    @org.springframework.data.jpa.repository.Query("SELECT a FROM ProductionAudit a WHERE (a.deleted = false OR a.deleted IS NULL) AND TRIM(a.manufacturerName) = TRIM(:manufacturerName) AND a.isDisclosed = true AND EXISTS (SELECT p FROM Product p WHERE p.itemCode = a.itemCode AND p.active = true)")
    List<ProductionAudit> findByManufacturerNameAndIsDisclosedTrueAndIsDeletedFalse(String manufacturerName);

    @org.springframework.data.jpa.repository.Query("SELECT DISTINCT p FROM Product p LEFT JOIN p.manufacturerInfo WHERE p.active = true AND NOT EXISTS " +
            "(SELECT a FROM ProductionAudit a WHERE a.itemCode = p.itemCode AND (a.deleted = false OR a.deleted IS NULL))")
    List<com.example.ims.entity.Product> findPendingProducts();

    @org.springframework.data.jpa.repository.Query("SELECT DISTINCT p FROM Product p LEFT JOIN p.manufacturerInfo WHERE p.active = true " +
            "AND (TRIM(p.manufacturerInfo.name) = TRIM(:manufacturerName) OR TRIM(p.manufacturer) = TRIM(:manufacturerName)) " +
            "AND NOT EXISTS (SELECT a FROM ProductionAudit a WHERE a.itemCode = p.itemCode AND (a.deleted = false OR a.deleted IS NULL))")
    List<com.example.ims.entity.Product> findPendingProductsByManufacturerInternal(String manufacturerName);

    @org.springframework.data.jpa.repository.Query("SELECT DISTINCT p FROM Product p LEFT JOIN p.manufacturerInfo WHERE p.active = true " +
            "AND (TRIM(p.manufacturerInfo.name) = TRIM(:manufacturerName) OR TRIM(p.manufacturer) = TRIM(:manufacturerName)) AND p.photoAuditDisclosed = true " +
            "AND NOT EXISTS (SELECT a FROM ProductionAudit a WHERE a.itemCode = p.itemCode AND (a.deleted = false OR a.deleted IS NULL))")
    List<com.example.ims.entity.Product> findPendingProductsByManufacturerAndIsDisclosedTrue(String manufacturerName);

    // Dashboard Queries - 표준 JPQL로 변환 (DB 교차 호환성 확보)
    @org.springframework.data.jpa.repository.Query("SELECT a FROM ProductionAudit a WHERE a.status = :status ORDER BY a.uploadDate DESC")
    List<ProductionAudit> findTop50ByStatusAndIsDeletedFalseOrderByUploadDateDesc(@org.springframework.data.repository.query.Param("status") String status);
    
    @org.springframework.data.jpa.repository.Query("SELECT a FROM ProductionAudit a WHERE a.manufacturerName = :manufacturerName AND a.status = :status AND a.isDisclosed = true ORDER BY a.uploadDate DESC")
    List<ProductionAudit> findTop50ByManufacturerNameAndStatusAndIsDisclosedTrueAndIsDeletedFalseOrderByUploadDateDesc(@org.springframework.data.repository.query.Param("manufacturerName") String manufacturerName, @org.springframework.data.repository.query.Param("status") String status);

    @org.springframework.data.jpa.repository.Query(value = "SELECT * FROM production_audit WHERE is_deleted = true ORDER BY upload_date DESC", nativeQuery = true)
    List<ProductionAudit> findDeletedAudits();

    @org.springframework.data.jpa.repository.Query(value = "SELECT * FROM production_audit WHERE is_deleted = true AND item_code = :itemCode ORDER BY upload_date DESC", nativeQuery = true)
    List<ProductionAudit> findDeletedAuditsByItemCode(@org.springframework.data.repository.query.Param("itemCode") String itemCode);

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.data.jpa.repository.Query(value = "UPDATE production_audit SET is_deleted = false WHERE id = :id", nativeQuery = true)
    void restoreAudit(Long id);
}
