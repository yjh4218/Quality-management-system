package com.example.ims.repository;

import com.example.ims.entity.ApprovalTemplate;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ApprovalTemplateRepository extends JpaRepository<ApprovalTemplate, Long> {

    @EntityGraph(attributePaths = {"docType", "createdBy", "steps"})
    Optional<ApprovalTemplate> findByDocTypeIdAndIsCurrentTrue(Long docTypeId);

    @EntityGraph(attributePaths = {"docType", "createdBy", "steps"})
    @Query("SELECT t FROM ApprovalTemplate t WHERE t.docType.code = :docTypeCode AND t.isCurrent = true")
    Optional<ApprovalTemplate> findByDocTypeCodeAndIsCurrentTrue(@Param("docTypeCode") String docTypeCode);

    @EntityGraph(attributePaths = {"docType", "createdBy"})
    List<ApprovalTemplate> findByDocTypeIdOrderByVersionDesc(Long docTypeId);

    @Query("SELECT COALESCE(MAX(t.version), 0) FROM ApprovalTemplate t WHERE t.docType.id = :docTypeId")
    Integer findMaxVersionByDocTypeId(@Param("docTypeId") Long docTypeId);
}
