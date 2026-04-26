package com.example.ims.service;

import com.example.ims.dto.DataTransferDto;
import com.example.ims.entity.SystemPageGuide;
import com.example.ims.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import jakarta.persistence.EntityManager;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;

/**
 * 전면 리네이밍된 전송 서비스입니다. (V14 - Metadata Purge)
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class DataTransferService {

    private final EntityManager entityManager;
    private final JdbcTemplate jdbcTemplate;
    private final UserRepository userRepository;
    private final BrandRepository brandRepository;
    private final ManufacturerRepository manufacturerRepository;
    private final ProductRepository productRepository;
    private final WmsInboundRepository inboundRepository;
    private final ClaimRepository claimRepository;
    private final PackagingSpecificationRepository packagingSpecRepository;
    private final ChannelPackagingRuleRepository channelRuleRepository;
    private final PackagingMethodTemplateRepository templateRepository;
    private final MasterPackagingMaterialRepository materialRepository;

    // Additional repositories
    private final SalesChannelRepository salesChannelRepository;
    private final RoleRepository roleRepository;
    private final ProductionAuditRepository productionAuditRepository;
    private final ProductionAuditHistoryRepository productionAuditHistoryRepository;
    private final BomCategoryRepository bomCategoryRepository;
    private final ClaimHistoryRepository claimHistoryRepository;
    private final ProductHistoryRepository productHistoryRepository;
    private final WmsInboundHistoryRepository wmsInboundHistoryRepository;
    private final AuditLogRepository auditLogRepository;
    private final DashboardLayoutRepository dashboardLayoutRepository;
    private final QualityReportRepository qualityReportRepository;
    
    // V15: SystemPageGuideRepository re-enabled after clean schema sweep
    private final SystemPageGuideRepository systemPageGuideRepository;

    private String lastError = "No errors yet.";
    private String lastStatus = "Idle";

    public String getMigrationStatus() { return lastStatus; }
    public String getMigrationError() { return lastError; }

    public void applySchemaHotfixes() {
        log.info(">>>> [TRANSFER] Applying V14 Clean Sweep...");
        try {
            jdbcTemplate.execute("DROP TABLE IF EXISTS page_guides CASCADE");
            jdbcTemplate.execute("DROP TABLE IF EXISTS system_page_guides CASCADE");
            
            jdbcTemplate.execute(
                "CREATE TABLE system_page_guides (" +
                "id SERIAL PRIMARY KEY, " +
                "page_key VARCHAR(255) NOT NULL UNIQUE, " +
                "title VARCHAR(255) NOT NULL, " +
                "sections_json TEXT, " +
                "created_at TIMESTAMP" +
                ")"
            );
            log.info(">>>> [TRANSFER] Clean sweep complete.");
        } catch (Exception e) {
            log.error(">>>> [TRANSFER] Clean sweep FAILED: {}", e.getMessage());
        }
    }

    @Transactional
    public void importData(DataTransferDto data) {
        lastStatus = "Starting...";
        lastError = null;
        log.info(">>>> [TRANSFER] STARTING BULK DATA IMPORT (V14)...");

        try {
            truncateAllTables();
            lastStatus = "Truncation complete";

            // 1. Core Metadata
            if (data.getBrands() != null) brandRepository.saveAll(data.getBrands());
            if (data.getManufacturers() != null) manufacturerRepository.saveAll(data.getManufacturers());
            if (data.getSalesChannels() != null) salesChannelRepository.saveAll(data.getSalesChannels());
            if (data.getRoles() != null) roleRepository.saveAll(data.getRoles());
            if (data.getBomCategories() != null) bomCategoryRepository.saveAll(data.getBomCategories());
            
            entityManager.flush();
            entityManager.clear();
            
            // 2. Users
            if (data.getUsers() != null) userRepository.saveAll(data.getUsers());
            
            entityManager.flush();
            entityManager.clear();
            
            // 3. Products
            if (data.getProducts() != null) productRepository.saveAll(data.getProducts());
            
            entityManager.flush();
            entityManager.clear();

            // 4. Transactional Data
            if (data.getInbounds() != null) inboundRepository.saveAll(data.getInbounds());
            if (data.getClaims() != null) claimRepository.saveAll(data.getClaims());
            if (data.getProductionAudits() != null) productionAuditRepository.saveAll(data.getProductionAudits());
            
            entityManager.flush();
            entityManager.clear();

            // 5. Secondary Data & Specs
            if (data.getMasterMaterials() != null) {
                materialRepository.saveAll(data.getMasterMaterials());
            }
            
            entityManager.flush();
            entityManager.clear();

            if (data.getPackagingSpecs() != null) packagingSpecRepository.saveAll(data.getPackagingSpecs());
            if (data.getChannelRules() != null) channelRuleRepository.saveAll(data.getChannelRules());
            if (data.getMethodTemplates() != null) templateRepository.saveAll(data.getMethodTemplates());
            if (data.getDashboardLayouts() != null) dashboardLayoutRepository.saveAll(data.getDashboardLayouts());
            
            // V15: SystemPageGuides restored
            if (data.getSystemPageGuides() != null) systemPageGuideRepository.saveAll(data.getSystemPageGuides());
            
            if (data.getQualityReports() != null) qualityReportRepository.saveAll(data.getQualityReports());
            
            entityManager.flush();
            entityManager.clear();

            // 6. History & Logs
            if (data.getProductionAuditHistories() != null) productionAuditHistoryRepository.saveAll(data.getProductionAuditHistories());
            if (data.getClaimHistories() != null) claimHistoryRepository.saveAll(data.getClaimHistories());
            if (data.getProductHistories() != null) productHistoryRepository.saveAll(data.getProductHistories());
            if (data.getWmsInboundHistories() != null) wmsInboundHistoryRepository.saveAll(data.getWmsInboundHistories());
            if (data.getAuditLogs() != null) auditLogRepository.saveAll(data.getAuditLogs());
            
            entityManager.flush();
            entityManager.clear();
            
            log.info(">>>> [TRANSFER] IMPORT COMPLETED SUCCESSFULLY.");
            lastStatus = "Success";
        } catch (Exception e) {
            lastStatus = "Failed";
            lastError = e.getClass().getSimpleName() + ": " + e.getMessage();
            log.error("Transfer failed: ", e);
            throw e;
        }
    }

    private void truncateAllTables() {
        java.util.List<String> existingTables = jdbcTemplate.queryForList(
            "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'",
            String.class
        );
        java.util.Set<String> excludeTables = java.util.Set.of("flyway_schema_history", "spring_session", "spring_session_attributes");
        java.util.List<String> tablesToTruncate = existingTables.stream()
            .filter(t -> !excludeTables.contains(t))
            .collect(java.util.stream.Collectors.toList());
        
        if (!tablesToTruncate.isEmpty()) {
            String truncateSql = "TRUNCATE TABLE " + String.join(", ", tablesToTruncate) + " RESTART IDENTITY CASCADE";
            jdbcTemplate.execute(truncateSql);
        }
    }

    /**
     * [추가 업데이트 전용] page_key 기준 upsert 방식으로 SystemPageGuide 데이터를 추가/갱신합니다.
     * 기존 데이터를 삭제하지 않으며, 동일 page_key가 있으면 업데이트, 없으면 삽입합니다.
     * 추후 별도 DB가 업데이트될 때 이 메서드를 호출하십시오.
     */
    @Transactional
    public Map<String, Object> upsertPageGuides(List<SystemPageGuide> guides) {
        if (guides == null || guides.isEmpty()) {
            return Map.of("status", "skipped", "count", 0, "message", "No guides provided.");
        }

        int inserted = 0;
        int updated = 0;

        for (SystemPageGuide guide : guides) {
            // ID를 null로 리셋하여 기존 DB ID와 충돌 방지
            guide.setId(null);

            java.util.Optional<SystemPageGuide> existing = systemPageGuideRepository.findByPageKey(guide.getPageKey());
            if (existing.isPresent()) {
                SystemPageGuide toUpdate = existing.get();
                toUpdate.setTitle(guide.getTitle());
                toUpdate.setSectionsJson(guide.getSectionsJson());
                systemPageGuideRepository.save(toUpdate);
                updated++;
            } else {
                systemPageGuideRepository.save(guide);
                inserted++;
            }
        }

        log.info("[PAGE GUIDE UPSERT] inserted={}, updated={}", inserted, updated);
        return Map.of(
            "status", "success",
            "inserted", inserted,
            "updated", updated,
            "total", guides.size()
        );
    }

    /**
     * [현재 Supabase에 저장된 page guide 목록 조회]
     */
    public List<SystemPageGuide> getPageGuides() {
        return systemPageGuideRepository.findAll();
    }

    /**
     * [1회성 마이그레이션 전용] 기존 Supabase page guide 데이터를 전체 삭제 후
     * H2에서 내보낸 데이터로 교체합니다.
     * - 기존 데이터: 삭제
     * - 신규 데이터: 삽입
     */
    @Transactional
    public void upsertPageGuidesWithReset(List<SystemPageGuide> guides) {
        log.info("[PAGE GUIDE MIGRATE] Deleting all existing page guides...");
        systemPageGuideRepository.deleteAll();
        systemPageGuideRepository.flush();

        if (guides == null || guides.isEmpty()) {
            log.warn("[PAGE GUIDE MIGRATE] No guides to insert. Done.");
            return;
        }

        // 각 가이드의 ID를 null로 초기화하여 DB auto-generate ID를 사용
        guides.forEach(g -> g.setId(null));
        systemPageGuideRepository.saveAll(guides);
        log.info("[PAGE GUIDE MIGRATE] Successfully inserted {} page guides.", guides.size());
    }
}
