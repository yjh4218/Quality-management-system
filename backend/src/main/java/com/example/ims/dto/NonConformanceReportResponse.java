package com.example.ims.dto;

import com.example.ims.entity.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class NonConformanceReportResponse {

    private Long id;
    private Long version;
    private String ncrNumber;
    private String title;
    private NcrOccurrenceStage stage;
    private String stageDescription;
    private NcrSeverity severity;
    private String severityDescription;
    private NcrStatus status;
    private String statusDescription;
    private String sourceType;
    private Long sourceRecordId;
    private String itemCode;
    private String productName;
    private String lotNumber;
    private BigDecimal affectedQuantity;
    private String unit;
    private String supplierName;
    private LocalDate occurredDate;
    private String discoveredBy;
    private String defectType;
    private String defectDescription;
    private String immediateAction;
    private QuarantineStatus quarantineStatus;
    private String quarantineStatusDescription;
    private String quarantineLocation;
    private String rootCauseAnalysis;
    private NcrDispositionType dispositionType;
    private String dispositionTypeDescription;
    private String dispositionDetails;
    private String dispositionApprovedBy;
    private LocalDateTime dispositionApprovedAt;
    private String reworkInstructions;
    private String concessionJustification;
    private Boolean capaRequired;
    private CapaLinkageStatus capaStatus;
    private String capaStatusDescription;
    private String capaReferenceId;
    private String capaRationale;
    private String closedBy;
    private LocalDateTime closedAt;
    private String closureRemarks;
    private List<NcrActionItemResponse> actionItems;
    private LocalDateTime createdAt;
    private String createdBy;
    private LocalDateTime updatedAt;
    private String updatedBy;

    public static NonConformanceReportResponse from(NonConformanceReport entity) {
        if (entity == null) return null;
        List<NcrActionItemResponse> actions = entity.getActionItems() != null
                ? entity.getActionItems().stream().map(NcrActionItemResponse::from).collect(Collectors.toList())
                : Collections.emptyList();

        return NonConformanceReportResponse.builder()
                .id(entity.getId())
                .version(entity.getVersion())
                .ncrNumber(entity.getNcrNumber())
                .title(entity.getTitle())
                .stage(entity.getStage())
                .stageDescription(entity.getStage() != null ? entity.getStage().getDescription() : null)
                .severity(entity.getSeverity())
                .severityDescription(entity.getSeverity() != null ? entity.getSeverity().getDescription() : null)
                .status(entity.getStatus())
                .statusDescription(entity.getStatus() != null ? entity.getStatus().getDescription() : null)
                .sourceType(entity.getSourceType())
                .sourceRecordId(entity.getSourceRecordId())
                .itemCode(entity.getItemCode())
                .productName(entity.getProductName())
                .lotNumber(entity.getLotNumber())
                .affectedQuantity(entity.getAffectedQuantity())
                .unit(entity.getUnit())
                .supplierName(entity.getSupplierName())
                .occurredDate(entity.getOccurredDate())
                .discoveredBy(entity.getDiscoveredBy())
                .defectType(entity.getDefectType())
                .defectDescription(entity.getDefectDescription())
                .immediateAction(entity.getImmediateAction())
                .quarantineStatus(entity.getQuarantineStatus())
                .quarantineStatusDescription(entity.getQuarantineStatus() != null ? entity.getQuarantineStatus().getDescription() : null)
                .quarantineLocation(entity.getQuarantineLocation())
                .rootCauseAnalysis(entity.getRootCauseAnalysis())
                .dispositionType(entity.getDispositionType())
                .dispositionTypeDescription(entity.getDispositionType() != null ? entity.getDispositionType().getDescription() : null)
                .dispositionDetails(entity.getDispositionDetails())
                .dispositionApprovedBy(entity.getDispositionApprovedBy())
                .dispositionApprovedAt(entity.getDispositionApprovedAt())
                .reworkInstructions(entity.getReworkInstructions())
                .concessionJustification(entity.getConcessionJustification())
                .capaRequired(entity.getCapaRequired())
                .capaStatus(entity.getCapaStatus())
                .capaStatusDescription(entity.getCapaStatus() != null ? entity.getCapaStatus().getDescription() : null)
                .capaReferenceId(entity.getCapaReferenceId())
                .capaRationale(entity.getCapaRationale())
                .closedBy(entity.getClosedBy())
                .closedAt(entity.getClosedAt())
                .closureRemarks(entity.getClosureRemarks())
                .actionItems(actions)
                .createdAt(entity.getCreatedAt())
                .createdBy(entity.getCreatedBy())
                .updatedAt(entity.getUpdatedAt())
                .updatedBy(entity.getUpdatedBy())
                .build();
    }
}
