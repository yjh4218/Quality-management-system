package com.example.ims.repository;

import com.example.ims.entity.ApprovalDocumentRead;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.Set;

@Repository
public interface ApprovalDocumentReadRepository extends JpaRepository<ApprovalDocumentRead, Long> {

    boolean existsByDocumentIdAndUserId(Long documentId, Long userId);

    Optional<ApprovalDocumentRead> findByDocumentIdAndUserId(Long documentId, Long userId);

    List<ApprovalDocumentRead> findByUserIdAndDocumentIdIn(Long userId, Collection<Long> documentIds);

    @Query("SELECT r.documentId FROM ApprovalDocumentRead r WHERE r.userId = :userId AND r.documentId IN :documentIds")
    Set<Long> findReadDocumentIdsByUserIdAndDocumentIdIn(@Param("userId") Long userId, @Param("documentIds") Collection<Long> documentIds);

    @Query("SELECT r.documentId FROM ApprovalDocumentRead r WHERE r.userId = :userId")
    Set<Long> findAllReadDocumentIdsByUserId(@Param("userId") Long userId);
}
