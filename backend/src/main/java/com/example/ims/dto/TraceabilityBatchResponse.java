package com.example.ims.dto;

import com.example.ims.entity.BatchStage;
import com.example.ims.entity.ItemCategory;
import com.example.ims.entity.TraceabilityBatch;
import com.example.ims.entity.TraceabilityQualityStatus;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TraceabilityBatchResponse {

    private Long id;
    private String batchNumber;
    private BatchStage batchStage;
    private String batchStageDesc;
    private String itemCode;
    private String itemName;
    private ItemCategory itemCategory;
    private String itemCategoryDesc;
    private String specification;
    private BigDecimal quantity;
    private BigDecimal remainingQuantity;
    private String unit;
    private LocalDate manufacturingDate;
    private LocalDate expirationDate;
    private String supplierOrManufacturer;
    private String manufacturingLine;
    private String storageLocation;
    private TraceabilityQualityStatus qualityStatus;
    private String qualityStatusDesc;
    private String qualityStatusColor;
    private String coaNumber;
    private String coaFileUrl;
    private String notes;
    private String createdBy;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static TraceabilityBatchResponse fromEntity(TraceabilityBatch entity) {
        if (entity == null) return null;
        return TraceabilityBatchResponse.builder()
                .id(entity.getId())
                .batchNumber(entity.getBatchNumber())
                .batchStage(entity.getBatchStage())
                .batchStageDesc(entity.getBatchStage() != null ? entity.getBatchStage().getDescription() : "")
                .itemCode(entity.getItemCode())
                .itemName(entity.getItemName())
                .itemCategory(entity.getItemCategory())
                .itemCategoryDesc(entity.getItemCategory() != null ? entity.getItemCategory().getDescription() : "")
                .specification(entity.getSpecification())
                .quantity(entity.getQuantity())
                .remainingQuantity(entity.getRemainingQuantity())
                .unit(entity.getUnit())
                .manufacturingDate(entity.getManufacturingDate())
                .expirationDate(entity.getExpirationDate())
                .supplierOrManufacturer(entity.getSupplierOrManufacturer())
                .manufacturingLine(entity.getManufacturingLine())
                .storageLocation(entity.getStorageLocation())
                .qualityStatus(entity.getQualityStatus())
                .qualityStatusDesc(entity.getQualityStatus() != null ? entity.getQualityStatus().getDescription() : "")
                .qualityStatusColor(entity.getQualityStatus() != null ? entity.getQualityStatus().getColor() : "#94a3b8")
                .coaNumber(entity.getCoaNumber())
                .coaFileUrl(entity.getCoaFileUrl())
                .notes(entity.getNotes())
                .createdBy(entity.getCreatedBy())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }
}
