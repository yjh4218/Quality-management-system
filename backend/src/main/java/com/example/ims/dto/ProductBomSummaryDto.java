package com.example.ims.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 제품코드별 포장재 BOM 및 사양서 통합 조회 DTO (EU PPWR / 규제 대응용)
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProductBomSummaryDto {
    // 1. 제품 정보
    private Long productId;
    private String itemCode;
    private String productName;
    private String englishProductName;
    private String brandName;
    private String productManufacturer;

    // 2. 포장 사양서 정보
    private Long packagingSpecId;
    private Integer specVersion;
    private Integer inboxQty;
    private Integer outboxQty;
    private String inboxSize;
    private String outboxSize;
    private String inboxType;
    private String outboxType;
    private Integer palletTotalProductQty;

    // 3. 구성품 BOM 상세 정보 (PackagingSpecBomItem + MasterPackagingMaterial)
    private Long bomItemId;
    private Long masterMaterialId;
    private String bomCode;
    private String componentName;
    private String type;
    private String detailedType;
    private String detailedMaterial;
    private String material;
    private Double weight;
    private Double thickness;
    private String specification;
    private Double usageCount;
    private String bomManufacturer;
    private Integer sortOrder;
    private Boolean isMultiLayer;
    private String imagePath;
}
