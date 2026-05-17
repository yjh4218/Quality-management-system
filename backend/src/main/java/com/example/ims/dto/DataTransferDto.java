package com.example.ims.dto;

import com.example.ims.entity.AuditLog;
import com.example.ims.entity.BomCategory;
import com.example.ims.entity.Brand;
import com.example.ims.entity.Claim;
import com.example.ims.entity.ClaimHistory;
import com.example.ims.entity.DashboardLayout;
import com.example.ims.entity.Manufacturer;
import com.example.ims.entity.MasterPackagingMaterial;
import com.example.ims.entity.PackagingMethodTemplate;
import com.example.ims.entity.PackagingSpecification;
import com.example.ims.entity.ChannelPackagingRule;
import com.example.ims.entity.Product;
import com.example.ims.entity.ProductHistory;
import com.example.ims.entity.ProductionAudit;
import com.example.ims.entity.ProductionAuditHistory;
import com.example.ims.entity.QualityReport;
import com.example.ims.entity.Role;
import com.example.ims.entity.SalesChannel;
import com.example.ims.entity.SystemPageGuide;
import com.example.ims.entity.User;
import com.example.ims.entity.WmsInbound;
import com.example.ims.entity.WmsInboundHistory;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * 전면 리네이밍된 전송 객체입니다. (V14 - Metadata Purge)
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DataTransferDto {
    private List<User> users;
    private List<Brand> brands;
    private List<Manufacturer> manufacturers;
    private List<Product> products;
    private List<WmsInbound> inbounds;
    private List<Claim> claims;
    private List<PackagingSpecification> packagingSpecs;
    private List<ChannelPackagingRule> channelRules;
    private List<PackagingMethodTemplate> methodTemplates;
    private List<MasterPackagingMaterial> masterMaterials;
    
    // Additional entities
    private List<SalesChannel> salesChannels;
    private List<Role> roles;
    private List<ProductionAudit> productionAudits;
    private List<ProductionAuditHistory> productionAuditHistories;
    private List<BomCategory> bomCategories;
    private List<ClaimHistory> claimHistories;
    private List<ProductHistory> productHistories;
    private List<WmsInboundHistory> wmsInboundHistories;
    private List<AuditLog> auditLogs;
    private List<DashboardLayout> dashboardLayouts;
    private List<QualityReport> qualityReports;
    
    // SystemPageGuides - V15 Re-enabled after schema clean sweep
    private List<SystemPageGuide> systemPageGuides;
}
