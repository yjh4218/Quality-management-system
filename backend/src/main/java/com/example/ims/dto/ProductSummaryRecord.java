package com.example.ims.dto;

import com.example.ims.entity.ProductType;
import java.time.LocalDateTime;

/**
 * [성능 최적화] N+1 문제를 근본적으로 해결하기 위한 Class-based DTO (Record).
 * SpEL 기반의 인터페이스 프로젝션 대신 JPQL Constructor Projection을 지원합니다.
 */
public record ProductSummaryRecord(
    Long id,
    String itemCode,
    String productName,
    String englishProductName,
    ProductType productType,
    String brandName,
    String manufacturerName,
    Integer shelfLifeMonths,
    String ingredients,
    Boolean isMaster,
    Boolean active,
    Boolean isPlanningSet,
    LocalDateTime createdAt,
    
    // Dimensions
    String dimensionsStatus,
    Double width,
    Double length,
    Double height,
    String weight,
    
    // Logistical Info
    Integer inboxQuantity,
    Double inboxWeight,
    Integer outboxQuantity,
    Double outboxWeight,
    Integer palletQuantity,
    
    // Packaging Materials
    String materialBody,
    Double weightBody,
    String materialLabel,
    Double weightLabel,
    String materialCap,
    Double weightCap,
    String materialSealing,
    Double weightSealing,
    String materialPump,
    Double weightPump,
    String materialOuterBox,
    Double weightOuterBox,
    String materialTool,
    Double weightTool,
    String materialPacking,
    Double weightPacking,
    String materialEtc,
    Double weightEtc,
    
    // Packaging Manufacturers & Remarks
    String manufacturerContainer,
    String manufacturerLabel,
    String manufacturerOuterBox,
    String manufacturerEtc,
    String materialRemarks
) {
}
