package com.example.ims.dto;

import com.example.ims.entity.AuthorityType;
import com.example.ims.entity.ProductRecall;
import com.example.ims.entity.ProductRegulatoryType;
import com.example.ims.entity.RecallClass;
import com.example.ims.entity.RecallStatus;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProductRecallResponse {

    private Long id;
    private String recallNumber;
    private String title;
    private RecallClass recallClass;
    private String recallClassName;
    private AuthorityType authorityType;
    private String authorityTypeName;
    private ProductRegulatoryType regulatoryType;
    private String regulatoryTypeName;
    private RecallStatus status;
    private String statusName;

    private String itemCode;
    private String productName;
    private String lotNumber;
    private LocalDate distributionStartDate;
    private LocalDate distributionEndDate;

    private LocalDate initiationDate;
    private LocalDate authorityReportDate;
    private String authorityApprovalNumber;
    private String recallReason;
    private String healthHazardAssessment;

    // 수량 대사 (Reconciliation)
    private Integer shippedQuantity;
    private Integer recalledQuantity;
    private Integer quarantinedQuantity;
    private Integer disposedQuantity;
    private Integer unretrievedQuantity;
    private Integer accountedQuantity;
    private Integer discrepancyQuantity;
    private Double recoveryRate;
    private Boolean isReconciliationBalanced;

    private String disposalMethod;
    private LocalDate disposalDate;
    private String disposalWitness;

    private String assignedLeader;
    private Long capaId;
    private String capaNumber;
    private String closureSummary;
    private LocalDate closedDate;
    private String closedBy;

    private String createdBy;
    private String updatedBy;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static ProductRecallResponse fromEntity(ProductRecall entity) {
        int shipped = entity.getShippedQuantity() != null ? entity.getShippedQuantity() : 0;
        int recalled = entity.getRecalledQuantity() != null ? entity.getRecalledQuantity() : 0;
        int quarantined = entity.getQuarantinedQuantity() != null ? entity.getQuarantinedQuantity() : 0;
        int disposed = entity.getDisposedQuantity() != null ? entity.getDisposedQuantity() : 0;
        int unretrieved = entity.getUnretrievedQuantity() != null ? entity.getUnretrievedQuantity() : 0;

        int accounted = recalled + quarantined + disposed + unretrieved;
        int discrepancy = shipped - accounted;
        boolean balanced = (shipped > 0 && discrepancy == 0);

        return ProductRecallResponse.builder()
                .id(entity.getId())
                .recallNumber(entity.getRecallNumber())
                .title(entity.getTitle())
                .recallClass(entity.getRecallClass())
                .recallClassName(entity.getRecallClass() != null ? entity.getRecallClass().getDescription() : null)
                .authorityType(entity.getAuthorityType())
                .authorityTypeName(entity.getAuthorityType() != null ? entity.getAuthorityType().name() : null)
                .regulatoryType(entity.getRegulatoryType())
                .regulatoryTypeName(entity.getRegulatoryType() != null ? entity.getRegulatoryType().getDescription() : null)
                .status(entity.getStatus())
                .statusName(entity.getStatus() != null ? entity.getStatus().getDescription() : null)
                .itemCode(entity.getItemCode())
                .productName(entity.getProductName())
                .lotNumber(entity.getLotNumber())
                .distributionStartDate(entity.getDistributionStartDate())
                .distributionEndDate(entity.getDistributionEndDate())
                .initiationDate(entity.getInitiationDate())
                .authorityReportDate(entity.getAuthorityReportDate())
                .authorityApprovalNumber(entity.getAuthorityApprovalNumber())
                .recallReason(entity.getRecallReason())
                .healthHazardAssessment(entity.getHealthHazardAssessment())
                .shippedQuantity(entity.getShippedQuantity())
                .recalledQuantity(entity.getRecalledQuantity())
                .quarantinedQuantity(entity.getQuarantinedQuantity())
                .disposedQuantity(entity.getDisposedQuantity())
                .unretrievedQuantity(entity.getUnretrievedQuantity())
                .accountedQuantity(accounted)
                .discrepancyQuantity(discrepancy)
                .recoveryRate(entity.getRecoveryRate())
                .isReconciliationBalanced(balanced)
                .disposalMethod(entity.getDisposalMethod())
                .disposalDate(entity.getDisposalDate())
                .disposalWitness(entity.getDisposalWitness())
                .assignedLeader(entity.getAssignedLeader())
                .capaId(entity.getCapaId())
                .capaNumber(entity.getCapaNumber())
                .closureSummary(entity.getClosureSummary())
                .closedDate(entity.getClosedDate())
                .closedBy(entity.getClosedBy())
                .createdBy(entity.getCreatedBy())
                .updatedBy(entity.getUpdatedBy())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }
}
