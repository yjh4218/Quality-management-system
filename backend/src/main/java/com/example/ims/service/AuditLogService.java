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
    private final AccessLogService accessLogService;
    private final NotificationService notificationService;
    
    // 순환 참조 방지를 위해 서비스 대신 레포지토리 직접 사용 또는 이벤트 핸들링만 수행
    // productService, claimService, wmsService는 더 이상 직접 참조하지 않음

    // [D-6 해결] 비동기 분기 유실 방지: 트랜잭션 커밋 완료 후 동기 실행하여 큐 포화 유실 0% 달성
    @org.springframework.transaction.event.TransactionalEventListener(phase = org.springframework.transaction.event.TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
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
                event.getNewEntity(),
                event.getChangeDetail()
        );

        // [SWR 실시간 동기화] DB 커밋 완료 후 연결된 모든 클라이언트에게 도메인 캐시 무효화 브로드캐스트
        try {
            String domain = resolveApiDomain(event.getEntityType());
            if (domain != null && notificationService != null) {
                notificationService.broadcastDataUpdate(domain);
            }
        } catch (Exception e) {
            log.warn("[SSE] Failed to broadcast data-updated event: {}", e.getMessage());
        }
    }

    private String resolveApiDomain(String entityType) {
        if (entityType == null) return null;
        switch (entityType.toUpperCase()) {
            case "PRODUCT": return "/api/products";
            case "CLAIM": return "/api/claims";
            case "WMSINBOUND":
            case "INBOUND":
            case "QUALITYREPORT": return "/api/quality/inbound";
            case "PRODUCTIONAUDIT": return "/api/production-audits";
            case "MANUFACTURERAUDIT": return "/api/manufacturer-audits";
            case "ROLE": return "/api/admin/roles";
            case "MATERIAL":
            case "MASTERDATA": return "/api/admin/master-data/materials";
            case "BOMCATEGORY": return "/api/admin/master-data/bom-categories";
            case "ANNOUNCEMENT": return "/api/announcements";
            case "SALESCHANNEL": return "/api/admin/master-data/sales-channels";
            case "SYSTEMSETTING": return "/api/system-settings";
            default: return "/api/" + entityType.toLowerCase();
        }
    }

    @Transactional(propagation = org.springframework.transaction.annotation.Propagation.REQUIRES_NEW)
    public void log(String entityType, Long entityId, String action, String modifier, 
            Long modifierId, String modifierUsername, String modifierName, String modifierCompany,
            String description, String oldValue, String newValue, String changeDetail) {
        LocalDateTime now = LocalDateTime.now();
        String hash = AuditLog.calculateHash(entityType, entityId, action, modifier, now, description);

        AuditLog auditLog = AuditLog.builder()
                .entityType(entityType != null ? entityType : "GENERAL")
                .entityId(entityId != null ? entityId : 0L)
                .action(action)
                .modifier(modifier)
                .modifierId(modifierId)
                .modifierUsername(modifierUsername)
                .modifierName(modifierName)
                .modifierCompany(modifierCompany)
                .description(description)
                .oldValue(oldValue)
                .newValue(newValue)
                .changeDetail(changeDetail)
                .modifiedAt(now)
                .recordHash(hash)
                .build();
        auditLogRepository.save(auditLog);
    }

    /**
     * [추가] 하위 호환성을 위한 오버로딩 메서드 (changeDetail 누락 대응)
     */
    @Transactional
    public void log(String entityType, Long entityId, String action, String modifier, 
            Long modifierId, String modifierUsername, String modifierName, String modifierCompany,
            String description, String oldValue, String newValue) {
        log(entityType, entityId, action, modifier, modifierId, modifierUsername, modifierName, modifierCompany, 
            description, oldValue, newValue, null);
    }

    /**
     * [추가] 간편 액션 로그 기록용 헬퍼 메서드 (SecurityContext 자동 추출 포함)
     */
    @Transactional
    public void logAction(String modifier, String action, String description, String changeDetail) {
        String effectiveModifier = modifier;
        if (effectiveModifier == null || effectiveModifier.isBlank() || "SYSTEM".equalsIgnoreCase(effectiveModifier)) {
            try {
                org.springframework.security.core.Authentication auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
                if (auth != null && auth.isAuthenticated() && !"anonymousUser".equals(auth.getPrincipal())) {
                    effectiveModifier = auth.getName();
                }
            } catch (Exception e) {
                // Keep default
            }
        }
        if (effectiveModifier == null || effectiveModifier.isBlank()) {
            effectiveModifier = "SYSTEM";
        }
        log(action, null, action, effectiveModifier, null, effectiveModifier, effectiveModifier, null, description, null, null, changeDetail);
    }

    @Transactional
    public void logEntityChange(String entityType, Long entityId, String action, String modifier,
            Long modifierId, String modifierUsername, String modifierName, String modifierCompany,
            String description, Object oldEntity, Object newEntity, String changeDetail) {
        String oldJson = (oldEntity instanceof String) ? (String) oldEntity : toCompactJson(oldEntity);
        String newJson = (newEntity instanceof String) ? (String) newEntity : toCompactJson(newEntity);

        log(entityType, entityId, action, modifier, modifierId, modifierUsername, modifierName, modifierCompany, 
            description, oldJson, newJson, changeDetail);
    }

    /**
     * [추가] 하위 호환성을 위한 오버로딩 메서드 (changeDetail 누락 대응)
     */
    @Transactional
    public void logEntityChange(String entityType, Long entityId, String action, String modifier,
            Long modifierId, String modifierUsername, String modifierName, String modifierCompany,
            String description, Object oldEntity, Object newEntity) {
        logEntityChange(entityType, entityId, action, modifier, modifierId, modifierUsername, modifierName, modifierCompany, 
            description, oldEntity, newEntity, null);
    }

    /**
     * 용량을 많이 차지하는 필드를 제외하고 JSON으로 직렬화 (DB 최적화)
     * ObjectMapper를 매번 생성하지 않고 Bean을 재사용하여 성능 최적화
     */
    public String toCompactJson(Object obj) {
        if (obj == null) return "-";
        if (obj instanceof String) return (String) obj;
        try {
            // writeValueAsString을 사용하여 Hibernate6Module의 FORCE_LAZY_LOADING=false 동작을 유지
            // (convertValue 사용 시 Lazy 프록시 강제 초기화 및 N+1 SELECT 유발 방지)
            String rawJson = objectMapper.writeValueAsString(obj);
            com.fasterxml.jackson.databind.JsonNode rootNode = objectMapper.readTree(rawJson);
            if (rootNode.isObject()) {
                com.fasterxml.jackson.databind.node.ObjectNode objectNode = (com.fasterxml.jackson.databind.node.ObjectNode) rootNode;
                String[] excludeFields = {
                    "imagePath", "imagePaths", "certMsds", "certStandard", "certFunction", "certExpiry", 
                    "coaFileUrl", "coaFileUrlEng", "files", "productIngredients", 
                    "packagingCertificates", "packagingMaterial", "inboxInfo", "outboxInfo", "palletInfo",
                    "channels", "components"
                };
                for (String field : excludeFields) {
                    objectNode.remove(field);
                }
                return objectMapper.writeValueAsString(objectNode);
            }
            return rawJson;
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
        String processedSearch = (search != null && !search.trim().isEmpty()) ? "%" + search.trim().toLowerCase() + "%" : null;

        try {
            if (startDate != null && !startDate.trim().isEmpty()) start = java.time.LocalDate.parse(startDate).atStartOfDay();
            if (endDate != null && !endDate.trim().isEmpty()) end = java.time.LocalDate.parse(endDate).atTime(23, 59, 59);
        } catch (Exception e) {
            log.warn("Invalid date format in logs search");
        }
        
        // 시스템 변경 이력에서는 ACCESS와 VIEW를 제외하고 검색
        return auditLogRepository.searchDataLogs(processedType, processedSearch, start, end, pageable);
    }

    /**
     * [D-7 해결] 의료기기 GMP 및 21 CFR Part 11 데이터 무결성 요건에 따라
     * 불완전한 JSON 스냅샷으로 기존 엔티티를 직접 덮어쓰는 행위는 금지됩니다.
     * 모든 데이터 정정은 승인된 변경관리(Change Control) 및 개정(Revision) 이력 추적을 통해 이루어져야 합니다.
     */
    @Deprecated
    @Transactional
    public void restoreFromLog(Long logId, String modifier) {
        throw new UnsupportedOperationException(
                "의료기기 GMP 데이터 무결성 규정(ISO 13485 / 21 CFR Part 11)에 따라 스냅샷 직접 덮어쓰기 복원은 지원되지 않으며, 정식 변경관리 및 개정 승인 절차를 통해 수행해야 합니다.");
    }

    @Transactional(readOnly = true)
    public List<AuditLog> getLogsForEntity(String entityType, Long entityId) {
        return auditLogRepository.findByEntityTypeAndEntityIdOrderByModifiedAtDesc(entityType, entityId);
    }

    /**
     * 사용자의 시스템 접속(로그인/로그아웃) 기록을 남깁니다.
     */
    @Transactional
    public void logAccess(String username, String action) {
        // [수정] 사용자 접근 로그는 AccessLogService에서 관리하므로 AuditLog에서는 기록하지 않음
        log.info("[AUDIT] Access Log (Skipped in AuditLog): {} by {}", action, username);
    }

    /**
     * 사용자의 페이지 열람 기록을 AccessLogService에 저장합니다.
     */
    @Transactional
    public void logPageView(String username, String pageKey, String pageTitle) {
        try {
            accessLogService.recordPageView(username, pageKey, pageTitle, LocalDateTime.now());
            log.debug("[AUDIT] Recorded Page View: {} ({}) by {}", pageTitle, pageKey, username);
        } catch (Exception e) {
            log.error("[AUDIT] Failed to record page view log: {}", e.getMessage());
        }
    }

    /**
     * 6개월 이상 된 오래된 로그를 별도 아카이브 테이블로 안전하게 복제 보존합니다.
     * (ISO 13485 / ISO 22716 감사추적 영구 보존 규정에 따라 메인 테이블 물리 삭제는 전면 폐지 - 결함 D-8 해결)
     */
    @Transactional
    public void archiveOldLogs() {
        LocalDateTime cutOffDate = LocalDateTime.now().minusMonths(6);
        log.info("[ARCHIVE] Starting archival of logs modified before {}", cutOffDate);
        
        try {
            int archivedCount = auditLogRepository.archiveOldLogs(cutOffDate);
            log.info("[ARCHIVE] Successfully copied {} logs to archive table (retaining originals in main table for regulatory audit trail).", archivedCount);
        } catch (Exception e) {
            log.error("[ARCHIVE] Archival process failed: {}", e.getMessage());
            throw e;
        }
    }
}
