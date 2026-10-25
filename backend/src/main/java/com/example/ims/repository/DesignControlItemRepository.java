package com.example.ims.repository;

import com.example.ims.entity.DesignControlItem;
import com.example.ims.entity.DesignItemType;
import com.example.ims.entity.VerificationResultStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DesignControlItemRepository extends JpaRepository<DesignControlItem, Long> {

    List<DesignControlItem> findByProjectIdOrderByIdAsc(Long projectId);

    Optional<DesignControlItem> findByProjectIdAndItemCode(Long projectId, String itemCode);

    boolean existsByProjectIdAndItemCode(Long projectId, String itemCode);

    List<DesignControlItem> findByProjectIdAndItemTypeOrderByIdAsc(Long projectId, DesignItemType itemType);

    long countByProjectId(Long projectId);

    long countByProjectIdAndVerificationResult(Long projectId, VerificationResultStatus status);

    @Query("SELECT d.verificationResult, COUNT(d) FROM DesignControlItem d WHERE d.project.id = :projectId GROUP BY d.verificationResult")
    List<Object[]> countByVerificationResultGroup(@Param("projectId") Long projectId);

    @Query("SELECT d.itemType, COUNT(d) FROM DesignControlItem d WHERE d.project.id = :projectId GROUP BY d.itemType")
    List<Object[]> countByItemTypeGroup(@Param("projectId") Long projectId);

    @Query("SELECT d.verificationResult, COUNT(d) FROM DesignControlItem d GROUP BY d.verificationResult")
    List<Object[]> countGlobalVerificationResultGroup();
}
