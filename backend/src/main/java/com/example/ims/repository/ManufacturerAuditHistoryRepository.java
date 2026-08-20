package com.example.ims.repository;

import com.example.ims.entity.ManufacturerAuditHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ManufacturerAuditHistoryRepository extends JpaRepository<ManufacturerAuditHistory, Long> {
    List<ManufacturerAuditHistory> findByAuditIdOrderByModifiedAtDesc(Long auditId);
}
