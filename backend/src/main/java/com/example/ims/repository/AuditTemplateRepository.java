package com.example.ims.repository;

import com.example.ims.entity.AuditTemplate;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.util.List;
import java.util.Optional;

public interface AuditTemplateRepository extends JpaRepository<AuditTemplate, Long> {
    
    // [안정화] 네이티브 쿼리로 is_active + is_deleted 필터링 (Hibernate 필터 우회)
    @Query(value = "SELECT * FROM audit_templates WHERE (is_active = true OR is_active IS NULL) AND (is_deleted = false OR is_deleted IS NULL) ORDER BY classification_name ASC", nativeQuery = true)
    List<AuditTemplate> findAllActiveTemplates();
    
    Optional<AuditTemplate> findById(Long id);
    
    Optional<AuditTemplate> findByClassificationName(String name);
}
