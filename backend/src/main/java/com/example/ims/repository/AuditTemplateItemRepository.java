package com.example.ims.repository;

import com.example.ims.entity.AuditTemplateItem;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AuditTemplateItemRepository extends JpaRepository<AuditTemplateItem, Long> {
}
