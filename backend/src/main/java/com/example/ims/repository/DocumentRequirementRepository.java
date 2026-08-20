package com.example.ims.repository;

import com.example.ims.entity.DocumentRequirement;
import com.example.ims.entity.DocumentEnumType;
import com.example.ims.entity.DocumentStatus;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface DocumentRequirementRepository extends JpaRepository<DocumentRequirement, Long>, JpaSpecificationExecutor<DocumentRequirement> {
    
    List<DocumentRequirement> findByProductId(Long productId);
    
    List<DocumentRequirement> findByManufacturerId(Long manufacturerId);
    
    Optional<DocumentRequirement> findByProductIdAndDocumentEnumType(Long productId, DocumentEnumType type);
    
    Optional<DocumentRequirement> findByProductIdAndCustomDocumentTypeId(Long productId, Long customTypeId);
    
    Optional<DocumentRequirement> findByManufacturerIdAndCustomDocumentTypeId(Long manufacturerId, Long customTypeId);

    Optional<DocumentRequirement> findBySecurityToken(String securityToken);

    /**
     * [스케줄러 N+1 최적화] PENDING, OVERDUE이거나 기한 초과(nextDueDate <= date)인 요구조건을 EntityGraph 연동 1회 JOIN으로 조회
     */
    @EntityGraph(attributePaths = {"product", "product.manufacturerInfo", "manufacturer", "customDocumentType"})
    @Query("SELECT d FROM DocumentRequirement d WHERE d.status IN :statuses OR (d.nextDueDate IS NOT NULL AND d.nextDueDate <= :date)")
    List<DocumentRequirement> findScheduledTargets(@Param("statuses") List<DocumentStatus> statuses, @Param("date") LocalDate date);

    /**
     * [스케줄러 N+1 최적화] REQUESTED 상태이면서 nextDueDate <= date 인 OVERDUE 전환 대상 조회
     */
    @EntityGraph(attributePaths = {"product", "manufacturer"})
    @Query("SELECT d FROM DocumentRequirement d WHERE d.status = :status AND d.nextDueDate IS NOT NULL AND d.nextDueDate <= :date")
    List<DocumentRequirement> findOverdueCandidates(@Param("status") DocumentStatus status, @Param("date") LocalDate date);
}
