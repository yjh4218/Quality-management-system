package com.example.ims.repository;

import com.example.ims.entity.ManufacturerAuditHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface ManufacturerAuditHistoryRepository extends JpaRepository<ManufacturerAuditHistory, Long> {
    List<ManufacturerAuditHistory> findByAuditIdOrderByModifiedAtDesc(Long auditId);
}
