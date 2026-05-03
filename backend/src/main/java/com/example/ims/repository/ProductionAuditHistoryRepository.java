package com.example.ims.repository;

import com.example.ims.entity.ProductionAuditHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ProductionAuditHistoryRepository extends JpaRepository<ProductionAuditHistory, Long> {
    List<ProductionAuditHistory> findByAuditIdOrderByModifiedAtDesc(Long auditId);
}
