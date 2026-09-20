package com.example.ims.repository;

import com.example.ims.entity.AuditTemplate;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.util.List;
import java.util.Optional;

public interface AuditTemplateRepository extends JpaRepository<AuditTemplate, Long> {
    
    @org.springframework.data.jpa.repository.EntityGraph(attributePaths = {"groups"})
    @Query("SELECT DISTINCT t FROM AuditTemplate t WHERE (t.active = true) AND (t.deleted = false OR t.deleted IS NULL) ORDER BY t.classificationName ASC")
    List<AuditTemplate> findAllActiveTemplates();
    
    @org.springframework.data.jpa.repository.EntityGraph(attributePaths = {"groups"})
    Optional<AuditTemplate> findById(Long id);
    
    Optional<AuditTemplate> findByClassificationName(String name);
}
