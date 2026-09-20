package com.example.ims.repository;

import com.example.ims.entity.MasterPackagingMaterial;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

/**
 * 포장재 재질 및 제조사 정보 마스터 레포지토리 (Feature 11)
 */
public interface MasterPackagingMaterialRepository extends JpaRepository<MasterPackagingMaterial, Long> {
    
    boolean existsByBomCode(String bomCode);

    List<MasterPackagingMaterial> findByManufacturer(String manufacturer);

    List<MasterPackagingMaterial> findByBomCodeStartingWith(String prefix);

    @org.springframework.data.jpa.repository.Query("SELECT MAX(m.bomCode) FROM MasterPackagingMaterial m WHERE m.bomCode LIKE CONCAT(:prefix, '%')")
    String findMaxBomCodeByPrefix(@org.springframework.data.repository.query.Param("prefix") String prefix);

    List<MasterPackagingMaterial> findByBomCodeContaining(String bomCode);
    
    List<MasterPackagingMaterial> findByComponentNameContaining(String componentName);

    @org.springframework.data.jpa.repository.Query("SELECT m FROM MasterPackagingMaterial m WHERE " +
            "(:companyFilter IS NULL OR m.manufacturer = :companyFilter) AND " +
            "(:bomCode IS NULL OR :bomCode = '' OR m.bomCode LIKE CONCAT('%', :bomCode, '%')) AND " +
            "(:componentName IS NULL OR :componentName = '' OR m.componentName LIKE CONCAT('%', :componentName, '%')) AND " +
            "(:type IS NULL OR :type = '' OR m.type = :type) AND " +
            "(:detailedType IS NULL OR :detailedType = '' OR m.detailedType = :detailedType) AND " +
            "(:detailedMaterial IS NULL OR :detailedMaterial = '' OR m.detailedMaterial LIKE CONCAT('%', :detailedMaterial, '%')) AND " +
            "(:manufacturer IS NULL OR :manufacturer = '' OR m.manufacturer LIKE CONCAT('%', :manufacturer, '%'))")
    List<MasterPackagingMaterial> searchMaterials(
            @org.springframework.data.repository.query.Param("companyFilter") String companyFilter,
            @org.springframework.data.repository.query.Param("bomCode") String bomCode,
            @org.springframework.data.repository.query.Param("componentName") String componentName,
            @org.springframework.data.repository.query.Param("type") String type,
            @org.springframework.data.repository.query.Param("detailedType") String detailedType,
            @org.springframework.data.repository.query.Param("detailedMaterial") String detailedMaterial,
            @org.springframework.data.repository.query.Param("manufacturer") String manufacturer);
}
