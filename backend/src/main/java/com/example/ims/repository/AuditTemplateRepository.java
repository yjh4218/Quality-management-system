package com.example.ims.repository;

import com.example.ims.entity.AuditTemplate;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface AuditTemplateRepository extends JpaRepository<AuditTemplate, Long> {
    List<AuditTemplate> findAllByActiveTrueOrderByClassificationNameAsc();
    
    Optional<AuditTemplate> findById(Long id);
    
    Optional<AuditTemplate> findByClassificationName(String name);
}
