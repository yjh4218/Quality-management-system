package com.example.ims.repository;

import com.example.ims.entity.ApprovalHistoryLog;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ApprovalHistoryLogRepository extends JpaRepository<ApprovalHistoryLog, Long> {

    @EntityGraph(attributePaths = {"actorUser"})
    List<ApprovalHistoryLog> findByDocumentIdOrderByCreatedAtAsc(Long documentId);
}
