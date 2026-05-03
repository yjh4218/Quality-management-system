package com.example.ims.util;

import com.example.ims.dto.DataTransferDto;
import com.example.ims.repository.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import java.io.File;

/**
 * H2 로컬 DB 데이터를 JSON 파일로 내보내는 마이그레이션 도구입니다.
 * 실행 방법: 로컬 환경에서 이 테스트 클래스만 단독으로 실행하세요.
 * 출력 파일: 프로젝트 루트의 h2_migration_data.json
 */
@SpringBootTest
@ActiveProfiles("local")
public class H2ExportTool {

    @Autowired private UserRepository userRepository;
    @Autowired private BrandRepository brandRepository;
    @Autowired private ManufacturerRepository manufacturerRepository;
    @Autowired private ProductRepository productRepository;
    @Autowired private WmsInboundRepository inboundRepository;
    @Autowired private ClaimRepository claimRepository;
    @Autowired private PackagingSpecificationRepository packagingSpecRepository;
    @Autowired private ChannelPackagingRuleRepository channelRuleRepository;
    @Autowired private PackagingMethodTemplateRepository templateRepository;
    @Autowired private MasterPackagingMaterialRepository materialRepository;
    @Autowired private SalesChannelRepository salesChannelRepository;
    @Autowired private RoleRepository roleRepository;
    @Autowired private ProductionAuditRepository productionAuditRepository;
    @Autowired private ProductionAuditHistoryRepository productionAuditHistoryRepository;
    @Autowired private BomCategoryRepository bomCategoryRepository;
    @Autowired private ClaimHistoryRepository claimHistoryRepository;
    @Autowired private ProductHistoryRepository productHistoryRepository;
    @Autowired private WmsInboundHistoryRepository wmsInboundHistoryRepository;
    @Autowired private AuditLogRepository auditLogRepository;
    @Autowired private DashboardLayoutRepository dashboardLayoutRepository;
    @Autowired private QualityReportRepository qualityReportRepository;
    @Autowired private SystemPageGuideRepository systemPageGuideRepository;

    @Test
    @org.springframework.transaction.annotation.Transactional(readOnly = true)
    public void exportDataToJson() throws Exception {
        System.out.println(">>>> [H2 EXPORT] STARTING DATA EXTRACTION (V15)...");

        var users = userRepository.findAll();
        var brands = brandRepository.findAll();
        var manufacturers = manufacturerRepository.findAll();
        var products = productRepository.findAll();
        var inbounds = inboundRepository.findAll();
        var claims = claimRepository.findAll();
        var packagingSpecs = packagingSpecRepository.findAll();
        var channelRules = channelRuleRepository.findAll();
        var methodTemplates = templateRepository.findAll();
        var materials = materialRepository.findAll();
        var salesChannels = salesChannelRepository.findAll();
        var roles = roleRepository.findAll();
        var productionAudits = productionAuditRepository.findAll();
        var productionAuditHistories = productionAuditHistoryRepository.findAll();
        var bomCategories = bomCategoryRepository.findAll();
        var claimHistories = claimHistoryRepository.findAll();
        var productHistories = productHistoryRepository.findAll();
        var wmsInboundHistories = wmsInboundHistoryRepository.findAll();
        var auditLogs = auditLogRepository.findAll();
        var dashboardLayouts = dashboardLayoutRepository.findAll();
        var qualityReports = qualityReportRepository.findAll();
        var systemPageGuides = systemPageGuideRepository.findAll();

        // Lazy 컬렉션 초기화 (LazyInitializationException 방지)
        manufacturers.forEach(m -> { if (m.getFiles() != null) m.getFiles().size(); });
        products.forEach(p -> { if (p.getComponents() != null) p.getComponents().size(); });
        packagingSpecs.forEach(s -> { if (s.getBomItems() != null) s.getBomItems().size(); });

        DataTransferDto data = DataTransferDto.builder()
                .users(users)
                .brands(brands)
                .manufacturers(manufacturers)
                .products(products)
                .inbounds(inbounds)
                .claims(claims)
                .packagingSpecs(packagingSpecs)
                .channelRules(channelRules)
                .methodTemplates(methodTemplates)
                .masterMaterials(materials)
                .salesChannels(salesChannels)
                .roles(roles)
                .productionAudits(productionAudits)
                .productionAuditHistories(productionAuditHistories)
                .bomCategories(bomCategories)
                .claimHistories(claimHistories)
                .productHistories(productHistories)
                .wmsInboundHistories(wmsInboundHistories)
                .auditLogs(auditLogs)
                .dashboardLayouts(dashboardLayouts)
                .qualityReports(qualityReports)
                .systemPageGuides(systemPageGuides)
                .build();

        ObjectMapper mapper = new ObjectMapper();
        mapper.setVisibility(com.fasterxml.jackson.annotation.PropertyAccessor.ALL, com.fasterxml.jackson.annotation.JsonAutoDetect.Visibility.NONE);
        mapper.setVisibility(com.fasterxml.jackson.annotation.PropertyAccessor.FIELD, com.fasterxml.jackson.annotation.JsonAutoDetect.Visibility.ANY);
        mapper.registerModule(new JavaTimeModule());
        mapper.disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
        mapper.enable(SerializationFeature.INDENT_OUTPUT);

        // 프로젝트 루트에 파일 저장
        File outputFile = new File("h2_migration_data.json");
        mapper.writeValue(outputFile, data);

        System.out.println(">>>> [H2 EXPORT] SUCCESS! Data exported to: " + outputFile.getAbsolutePath());
        System.out.println(">>>> [H2 EXPORT] FILE SIZE: " + outputFile.length() + " bytes");
        System.out.println(">>>> [H2 EXPORT] Users: " + users.size()
                + ", Products: " + products.size()
                + ", PageGuides: " + systemPageGuides.size());
    }
}
