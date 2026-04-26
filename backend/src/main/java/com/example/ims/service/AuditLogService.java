package com.example.ims.service;

import com.example.ims.entity.AuditLog;
import com.example.ims.event.EntityChangeEvent;
import com.example.ims.repository.AuditLogRepository;
import com.example.ims.repository.ClaimRepository;
import com.example.ims.repository.ProductRepository;
import com.example.ims.entity.Product;
import com.example.ims.entity.Claim;
import com.example.ims.repository.ProductionAuditRepository;
import com.example.ims.repository.WmsInboundRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuditLogService {

    private final AuditLogRepository auditLogRepository;
    private final ProductRepository productRepository;
    private final ClaimRepository claimRepository;
    private final WmsInboundRepository wmsInboundRepository;
    private final ProductionAuditRepository productionAuditRepository;
    private final ObjectMapper objectMapper;
    
    // 순환 참조 방지를 위해 서비스 대신 레포지토리 직접 사용 또는 이벤트 핸들링만 수행
    // productService, claimService, wmsService는 더 이상 직접 참조하지 않음

    @EventListener
    @Transactional
    public void handleEntityChangeEvent(EntityChangeEvent event) {
        log.debug("[AUDIT] Event received: {} on {} (ID: {})", event.getAction(), event.getEntityType(), event.getEntityId());
        logEntityChange(
                event.getEntityType(),
                event.getEntityId(),
                event.getAction(),
                event.getModifier(),
                event.getModifierId(),
                event.getModifierUsername(),
                event.getModifierName(),
                event.getModifierCompany(),
                event.getDescription(),
                event.getOldEntity(),
                event.getNewEntity()
        );
    }

    @Transactional
    public void log(String entityType, Long entityId, String action, String modifier, 
            Long modifierId, String modifierUsername, String modifierName, String modifierCompany,
            String description, String oldValue, String newValue) {
        AuditLog auditLog = AuditLog.builder()
                .entityType(entityType)
                .entityId(entityId)
                .action(action)
                .modifier(modifier)
                .modifierId(modifierId)
                .modifierUsername(modifierUsername)
                .modifierName(modifierName)
                .modifierCompany(modifierCompany)
                .description(description)
                .oldValue(oldValue)
                .newValue(newValue)
                .modifiedAt(LocalDateTime.now())
                .build();
        auditLogRepository.save(auditLog);
    }

    @Transactional
    public void logEntityChange(String entityType, Long entityId, String action, String modifier,
            Long modifierId, String modifierUsername, String modifierName, String modifierCompany,
            String description, Object oldEntity, Object newEntity) {
        String oldJson = (oldEntity instanceof String) ? (String) oldEntity : toCompactJson(oldEntity);
        String newJson = (newEntity instanceof String) ? (String) newEntity : toCompactJson(newEntity);

        log(entityType, entityId, action, modifier, modifierId, modifierUsername, modifierName, modifierCompany, description, oldJson, newJson);
    }

    /**
     * 용량을 많이 차지하는 필드를 제외하고 JSON으로 직렬화 (DB 최적화)
     * ObjectMapper를 매번 생성하지 않고 Bean을 재사용하여 성능 최적화
     */
    public String toCompactJson(Object obj) {
        if (obj == null) return "-";
        if (obj instanceof String) return (String) obj;
        try {
            // ObjectMapper 설정은 Bean 생성 시 이미 되어 있다고 가정하거나 여기서 변환만 수행
            Map<String, Object> map = objectMapper.convertValue(obj, new TypeReference<Map<String, Object>>() {});
            
            // 제외할 필드 목록 (이미지, 대용량 데이터 등)
            String[] excludeFields = {
                "imagePath", "imagePaths", "certMsds", "certStandard", "certFunction", "certExpiry", 
                "coaFileUrl", "coaFileUrlEng", "files", "productIngredients", 
                "packagingCertificates", "packagingMaterial", "inboxInfo", "outboxInfo", "palletInfo",
                "channels", "components"
            };
            
            for (String field : excludeFields) {
                map.remove(field);
            }

            return objectMapper.writeValueAsString(map);
        } catch (Exception e) {
            log.error("Serialization failed for audit log: {}", e.getMessage());
            return "{\"error\": \"Serialization failed\"}";
        }
    }

    @Transactional(readOnly = true)
    public org.springframework.data.domain.Page<AuditLog> getAllLogs(org.springframework.data.domain.Pageable pageable) {
        return auditLogRepository.findAll(pageable);
    }

    @Transactional(readOnly = true)
    public org.springframework.data.domain.Page<AuditLog> searchLogs(String entityType, String search, String startDate, String endDate, org.springframework.data.domain.Pageable pageable) {
        LocalDateTime start = null;
        LocalDateTime end = null;
        
        String processedType = (entityType == null || entityType.trim().isEmpty() || entityType.equals("ALL")) ? null : entityType;
        String processedSearch = (search != null && !search.trim().isEmpty()) ? "%" + search.trim() + "%" : null;

        try {
            if (startDate != null && !startDate.trim().isEmpty()) start = java.time.LocalDate.parse(startDate).atStartOfDay();
            if (endDate != null && !endDate.trim().isEmpty()) end = java.time.LocalDate.parse(endDate).atTime(23, 59, 59);
        } catch (Exception e) {
            log.warn("Invalid date format in logs search");
        }
        
        return auditLogRepository.searchLogs(processedType, processedSearch, start, end, pageable);
    }

    @Transactional
    public void restoreFromLog(Long logId, String modifier) {
        AuditLog logEntry = auditLogRepository.findById(logId)
                .orElseThrow(() -> new RuntimeException("Log entry not found"));
        
        String json = logEntry.getOldValue();
        if (json == null || "-".equals(json) || json.startsWith("SNAPSHOT_")) {
            throw new RuntimeException("Data for this entry is not restorable or is only a snapshot reference.");
        }

        try {
            Long entityId = logEntry.getEntityId();
            if ("PRODUCT".equals(logEntry.getEntityType())) {
                Product current = productRepository.findById(entityId).orElseThrow();
                Product restored = objectMapper.readValue(json, Product.class);
                // Copy restorable fields... (Simplified for now)
                restored.setId(entityId); 
                productRepository.save(restored);
            } else if ("CLAIM".equals(logEntry.getEntityType())) {
                Claim current = claimRepository.findById(entityId).orElseThrow();
                Claim restored = objectMapper.readValue(json, Claim.class);
                restored.setId(entityId);
                claimRepository.save(restored);
            } else if ("WMS_INBOUND".equals(logEntry.getEntityType())) {
                com.example.ims.entity.WmsInbound current = wmsInboundRepository.findById(entityId).orElseThrow();
                com.example.ims.entity.WmsInbound restored = objectMapper.readValue(json, com.example.ims.entity.WmsInbound.class);
                restored.setId(entityId);
                wmsInboundRepository.save(restored);
            } else if ("PRODUCTION_AUDIT".equals(logEntry.getEntityType())) {
                com.example.ims.entity.ProductionAudit current = productionAuditRepository.findById(entityId).orElseThrow();
                com.example.ims.entity.ProductionAudit restored = objectMapper.readValue(json, com.example.ims.entity.ProductionAudit.class);
                restored.setId(entityId);
                productionAuditRepository.save(restored);
            }

            log(logEntry.getEntityType(), entityId, "RESTORE", modifier, 
                null, modifier, null, null,
                "Restored from Log ID: " + logId, "-", "Restored to previous state");
            
        } catch (Exception e) {
            log.error("Restore failed: {}", e.getMessage());
            throw new RuntimeException("Restore failed: " + e.getMessage());
        }
    }

    @Transactional(readOnly = true)
    public List<AuditLog> getLogsForEntity(String entityType, Long entityId) {
        return auditLogRepository.findByEntityTypeAndEntityIdOrderByModifiedAtDesc(entityType, entityId);
    }

    /**
     * 6개월 이상 된 오래된 로그를 별도 테이블로 이전하고 삭제합니다.
     */
    @Transactional
    public void archiveOldLogs() {
        LocalDateTime cutOffDate = LocalDateTime.now().minusMonths(6);
        log.info("[ARCHIVE] Starting archival of logs modified before {}", cutOffDate);
        
        try {
            int archivedCount = auditLogRepository.archiveOldLogs(cutOffDate);
            log.info("[ARCHIVE] Successfully moved {} logs to archive table.", archivedCount);
            
            if (archivedCount > 0) {
                int deletedCount = auditLogRepository.deleteArchivedLogs(cutOffDate);
                log.info("[ARCHIVE] Successfully deleted {} logs from main table.", deletedCount);
            }
        } catch (Exception e) {
            log.error("[ARCHIVE] Archival process failed: {}", e.getMessage());
            throw e;
        }
    }
}
