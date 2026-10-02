package com.example.ims.repository;

import com.example.ims.entity.ApprovalDocument;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ApprovalDocumentRepository extends JpaRepository<ApprovalDocument, Long> {

    @EntityGraph(attributePaths = {"docType", "template", "submittedBy"})
    Optional<ApprovalDocument> findDetailById(Long id);

    @EntityGraph(attributePaths = {"docType", "submittedBy"})
    Page<ApprovalDocument> findBySubmittedByIdOrderByCreatedAtDesc(Long submittedById, Pageable pageable);

    @EntityGraph(attributePaths = {"docType", "submittedBy"})
    Page<ApprovalDocument> findByStatusOrderByCreatedAtDesc(String status, Pageable pageable);

    // 수신함 (Inbox): 내게 차례가 온 결재/합의 건 (step_instances에 assignee_user_id = :userId and status = 'PENDING')
    @EntityGraph(attributePaths = {"docType", "submittedBy"})
    @Query("SELECT DISTINCT d FROM ApprovalDocument d " +
           "JOIN d.stepInstances s " +
           "WHERE s.assigneeUser.id = :userId " +
           "AND s.status = 'PENDING' " +
           "AND d.status = 'PENDING' " +
           "AND s.stepType IN ('APPROVAL', 'AGREEMENT') " +
           "ORDER BY d.createdAt DESC")
    Page<ApprovalDocument> findPendingForAssignee(@Param("userId") Long userId, Pageable pageable);

    // 참조함 (Reference Inbox): 참조자로 지정된 문서
    @EntityGraph(attributePaths = {"docType", "submittedBy"})
    @Query("SELECT DISTINCT d FROM ApprovalDocument d " +
           "JOIN d.stepInstances s " +
           "WHERE s.assigneeUser.id = :userId " +
           "AND s.stepType = 'REFERENCE' " +
           "ORDER BY d.createdAt DESC")
    Page<ApprovalDocument> findReferencedForUser(@Param("userId") Long userId, Pageable pageable);

    // 내가 처리(승인/반려)했던 결재 건
    @EntityGraph(attributePaths = {"docType", "submittedBy"})
    @Query("SELECT DISTINCT d FROM ApprovalDocument d " +
           "JOIN d.stepInstances s " +
           "WHERE s.assigneeUser.id = :userId " +
           "AND s.status IN ('APPROVED', 'REJECTED') " +
           "ORDER BY d.createdAt DESC")
    Page<ApprovalDocument> findProcessedByAssignee(@Param("userId") Long userId, Pageable pageable);

    // 원본 레코드 및 문서 유형으로 진행 중이거나 완료된 결재 조회
    List<ApprovalDocument> findByDocTypeCodeAndSourceRecordIdOrderByCreatedAtDesc(String docTypeCode, Long sourceRecordId);

    Optional<ApprovalDocument> findFirstByDocTypeCodeAndSourceRecordIdAndStatusInOrderByCreatedAtDesc(
            String docTypeCode, Long sourceRecordId, List<String> statuses);
}
