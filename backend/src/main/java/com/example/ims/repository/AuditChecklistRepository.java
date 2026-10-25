package com.example.ims.repository;

import com.example.ims.entity.AuditChecklist;
import com.example.ims.entity.ChecklistResult;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AuditChecklistRepository extends JpaRepository<AuditChecklist, Long> {

    List<AuditChecklist> findByInternalAuditIdOrderByIdAsc(Long internalAuditId);

    List<AuditChecklist> findByInternalAuditIdAndResult(Long internalAuditId, ChecklistResult result);

    long countByInternalAuditId(Long internalAuditId);

    long countByInternalAuditIdAndResult(Long internalAuditId, ChecklistResult result);
}
