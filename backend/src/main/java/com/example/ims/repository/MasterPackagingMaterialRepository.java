package com.example.ims.repository;

import com.example.ims.entity.MasterPackagingMaterial;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

/**
 * 포장재 재질 및 제조사 정보 마스터 레포지토리 (Feature 11)
 */
public interface MasterPackagingMaterialRepository extends JpaRepository<MasterPackagingMaterial, Long> {
    
    boolean existsByBomCode(String bomCode);

    List<MasterPackagingMaterial> findByBomCodeStartingWith(String prefix);

    List<MasterPackagingMaterial> findByBomCodeContaining(String bomCode);
    
    List<MasterPackagingMaterial> findByComponentNameContaining(String componentName);
}
