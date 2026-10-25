package com.example.ims.dto;

import com.example.ims.entity.TraceabilityLink;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TraceabilityLinkResponse {

    private Long id;
    private String parentBatchNumber;
    private String parentItemName;
    private String childBatchNumber;
    private String childItemName;
    private String processStep;
    private BigDecimal inputQuantity;
    private String inputUnit;
    private BigDecimal yieldRatio;
    private LocalDate linkDate;
    private String operatorName;
    private String notes;
    private String createdBy;
    private LocalDateTime createdAt;

    public static TraceabilityLinkResponse fromEntity(TraceabilityLink entity) {
        if (entity == null) return null;
        return TraceabilityLinkResponse.builder()
                .id(entity.getId())
                .parentBatchNumber(entity.getParentBatchNumber())
                .childBatchNumber(entity.getChildBatchNumber())
                .processStep(entity.getProcessStep())
                .inputQuantity(entity.getInputQuantity())
                .inputUnit(entity.getInputUnit())
                .yieldRatio(entity.getYieldRatio())
                .linkDate(entity.getLinkDate())
                .operatorName(entity.getOperatorName())
                .notes(entity.getNotes())
                .createdBy(entity.getCreatedBy())
                .createdAt(entity.getCreatedAt())
                .build();
    }
}
