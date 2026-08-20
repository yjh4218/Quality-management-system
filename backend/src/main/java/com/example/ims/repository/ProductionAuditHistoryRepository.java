package com.example.ims.repository;

import com.example.ims.entity.ProductionAuditHistory;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ProductionAuditHistoryRepository extends JpaRepository<ProductionAuditHistory, Long> {
    List<ProductionAuditHistory> findByAuditIdOrderByModifiedAtDesc(Long auditId);
}
