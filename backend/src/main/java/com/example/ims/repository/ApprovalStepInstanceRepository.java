package com.example.ims.repository;

import com.example.ims.entity.ApprovalStepInstance;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ApprovalStepInstanceRepository extends JpaRepository<ApprovalStepInstance, Long> {

    @EntityGraph(attributePaths = {"assigneeUser"})
    List<ApprovalStepInstance> findByDocumentIdOrderByStepOrderAscIdAsc(Long documentId);

    @EntityGraph(attributePaths = {"document", "assigneeUser"})
    List<ApprovalStepInstance> findByDocumentIdAndStepOrder(Long documentId, Integer stepOrder);

    @EntityGraph(attributePaths = {"document", "assigneeUser"})
    Optional<ApprovalStepInstance> findByDocumentIdAndAssigneeUserIdAndStatus(Long documentId, Long assigneeUserId, String status);

    @EntityGraph(attributePaths = {"document", "assigneeUser"})
    List<ApprovalStepInstance> findByAssigneeUserIdAndStatus(Long assigneeUserId, String status);

    long countByDocumentIdAndStepOrderAndStatusNot(Long documentId, Integer stepOrder, String status);
}
