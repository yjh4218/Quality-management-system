package com.example.ims.service;

import com.example.ims.entity.*;
import com.example.ims.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDate;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ManufacturerAuditService {

    private final ManufacturerAuditRepository auditRepository;
    private final AuditTemplateRepository templateRepository;
    private final ManufacturerRepository manufacturerRepository;
    private final SystemSettingRepository settingRepository;
    private final com.fasterxml.jackson.databind.ObjectMapper objectMapper;

    public List<AuditTemplate> getAllTemplates() {
        return templateRepository.findAllByActiveTrueOrderByClassificationNameAsc();
    }

    @Transactional(readOnly = true)
    public AuditTemplate getTemplateById(Long id) {
        AuditTemplate template = templateRepository.findById(id).orElse(null);
        if (template != null) {
            // Explicitly initialize collections to prevent 500 LazyInitializationException
            template.getGroups().forEach(group -> {
                group.getItems().size(); // Trigger load
            });
        }
        return template;
    }

    @Transactional
    public AuditTemplate saveTemplate(AuditTemplate template) {
        // Ensure bidirectional relationship for JPA cascading
        if (template.getGroups() != null) {
            template.getGroups().forEach(group -> {
                group.setTemplate(template);
                if (group.getItems() != null) {
                    group.getItems().forEach(item -> item.setGroup(group));
                }
            });
        }
        return templateRepository.save(template);
    }

    @Transactional(readOnly = true)
    public List<ManufacturerAudit> searchAudits(LocalDate startDate, LocalDate endDate, String manufacturerName) {
        List<ManufacturerAudit> audits = auditRepository.searchAudits(startDate, endDate, manufacturerName);
        audits.forEach(audit -> {
            if (audit.getManufacturer() != null) audit.getManufacturer().getName();
            if (audit.getTemplate() != null) audit.getTemplate().getClassificationName();
        });
        return audits;
    }

    @Transactional
    public ManufacturerAudit saveAudit(ManufacturerAudit audit) {
        // 1. Calculate Score & Grade
        calculateScoreAndGrade(audit);
        
        // 2. Set relationships
        if (audit.getResults() != null) {
            audit.getResults().forEach(result -> result.setAudit(audit));
        }
        
        ManufacturerAudit saved = auditRepository.save(audit);
        
        // Force initialize lazy proxies to prevent serialization errors during response generation
        if (saved.getTemplate() != null) {
            saved.getTemplate().getClassificationName(); // touch for init
        }
        if (saved.getManufacturer() != null) {
            saved.getManufacturer().getName(); // touch for init
        }
        
        // Initialize photo collections to prevent LazyInitializationException on response
        saved.getPositivePhotos().size();
        saved.getNegativePhotos().size();
        
        return saved;
    }

    private void calculateScoreAndGrade(ManufacturerAudit audit) {
        if (audit.getResults() == null || audit.getResults().isEmpty()) {
            audit.setTotalScore(0);
            audit.setGrade("F");
            return;
        }

        int totalScore = audit.getResults().stream().mapToInt(ManufacturerAuditResult::getScore).sum();
        int maxPossible = audit.getResults().size() * 5;
        
        double percentage = (maxPossible > 0) ? (double) totalScore / maxPossible * 100 : 0;
        audit.setTotalScore((int) Math.round(percentage));

        // Load dynamic thresholds
        int thresholdA = 90, thresholdB = 80, thresholdC = 70, thresholdD = 60;
        try {
            SystemSetting setting = settingRepository.findById("AUDIT_GRADE_THRESHOLDS").orElse(null);
            if (setting != null) {
                com.fasterxml.jackson.databind.JsonNode nodes = objectMapper.readTree(setting.getSettingValue());
                thresholdA = nodes.get("A").asInt();
                thresholdB = nodes.get("B").asInt();
                thresholdC = nodes.get("C").asInt();
                thresholdD = nodes.get("D").asInt();
            }
        } catch (Exception e) {
            // Fallback to defaults
        }

        if (percentage >= thresholdA) audit.setGrade("A");
        else if (percentage >= thresholdB) audit.setGrade("B");
        else if (percentage >= thresholdC) audit.setGrade("C");
        else if (percentage >= thresholdD) audit.setGrade("D");
        else audit.setGrade("F");
    }

    public void deleteAudit(Long id) {
        auditRepository.deleteById(id);
    }
    
    public void deleteTemplate(Long id) {
        templateRepository.findById(id).ifPresent(t -> {
            t.setActive(false);
            templateRepository.save(t);
        });
    }
}
