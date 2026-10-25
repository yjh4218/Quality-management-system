package com.example.ims.dto;

import com.example.ims.entity.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CapaResponse {

    private Long id;
    private String capaNumber;
    private String title;

    private CapaSourceType sourceType;
    private String sourceTypeDescription;
    private Long sourceId;
    private String sourceNumber;
    private String sourceDescription;

    private CapaCategory category;
    private String categoryDescription;

    private CapaRiskLevel riskLevel;
    private String riskLevelDescription;
    private String riskLevelColor;

    private CapaStatus status;
    private String statusDescription;
    private String statusColor;

    // 문제 설명 및 임시 봉쇄조치
    private String problemDescription;
    private String containmentAction;
    private LocalDate containmentDate;
    private String containmentResponsible;

    // 근본원인 분석
    private String rootCauseAnalysis;
    private String why1;
    private String why2;
    private String why3;
    private String why4;
    private String why5;
    private String fishboneMan;
    private String fishboneMachine;
    private String fishboneMaterial;
    private String fishboneMethod;
    private String fishboneMeasurement;
    private String fishboneEnvironment;

    // 품목 및 LOT
    private String itemCode;
    private String productName;
    private String lotNumber;
    private Boolean isLotUnknown;

    // 일정 및 담당자
    private String assignedTo;
    private LocalDate targetCompletionDate;
    private LocalDate actualCompletionDate;
    private Boolean isOverdue;

    // 효과성 검증
    private String effectivenessCriteria;
    private LocalDate effectivenessTargetDate;
    private LocalDate effectivenessReviewedDate;
    private String effectivenessReviewedBy;
    private EffectivenessResult effectivenessResult;
    private String effectivenessResultDescription;
    private String effectivenessResultColor;
    private String effectivenessEvidence;
    private Boolean followUpActionRequired;

    // 종결 정보
    private String closureComment;
    private String closedBy;
    private LocalDate closedDate;

    // 조치과제
    private int actionItemCount;
    private int completedActionItemCount;
    @Builder.Default
    private List<CapaActionItemResponse> actionItems = new ArrayList<>();

    // 감사추적
    private String createdBy;
    private String updatedBy;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private Long version;

    public static CapaResponse fromEntity(CapaRecord record) {
        if (record == null) return null;

        boolean overdue = record.getStatus() != CapaStatus.CLOSED 
                && record.getStatus() != CapaStatus.VOID 
                && record.getTargetCompletionDate() != null 
                && record.getTargetCompletionDate().isBefore(LocalDate.now());

        List<CapaActionItemResponse> items = record.getActionItems() != null
                ? record.getActionItems().stream()
                        .map(CapaActionItemResponse::fromEntity)
                        .collect(Collectors.toList())
                : new ArrayList<>();

        int completedCount = (int) items.stream()
                .filter(i -> "COMPLETED".equalsIgnoreCase(i.getStatus()))
                .count();

        return CapaResponse.builder()
                .id(record.getId())
                .capaNumber(record.getCapaNumber())
                .title(record.getTitle())
                .sourceType(record.getSourceType())
                .sourceTypeDescription(record.getSourceType() != null ? record.getSourceType().getDescription() : null)
                .sourceId(record.getSourceId())
                .sourceNumber(record.getSourceNumber())
                .sourceDescription(record.getSourceDescription())
                .category(record.getCategory())
                .categoryDescription(record.getCategory() != null ? record.getCategory().getDescription() : null)
                .riskLevel(record.getRiskLevel())
                .riskLevelDescription(record.getRiskLevel() != null ? record.getRiskLevel().getDescription() : null)
                .riskLevelColor(record.getRiskLevel() != null ? record.getRiskLevel().getColor() : null)
                .status(record.getStatus())
                .statusDescription(record.getStatus() != null ? record.getStatus().getDescription() : null)
                .statusColor(record.getStatus() != null ? record.getStatus().getColor() : null)
                .problemDescription(record.getProblemDescription())
                .containmentAction(record.getContainmentAction())
                .containmentDate(record.getContainmentDate())
                .containmentResponsible(record.getContainmentResponsible())
                .rootCauseAnalysis(record.getRootCauseAnalysis())
                .why1(record.getWhy1())
                .why2(record.getWhy2())
                .why3(record.getWhy3())
                .why4(record.getWhy4())
                .why5(record.getWhy5())
                .fishboneMan(record.getFishboneMan())
                .fishboneMachine(record.getFishboneMachine())
                .fishboneMaterial(record.getFishboneMaterial())
                .fishboneMethod(record.getFishboneMethod())
                .fishboneMeasurement(record.getFishboneMeasurement())
                .fishboneEnvironment(record.getFishboneEnvironment())
                .itemCode(record.getItemCode())
                .productName(record.getProductName())
                .lotNumber(record.getLotNumber())
                .isLotUnknown(record.getIsLotUnknown())
                .assignedTo(record.getAssignedTo())
                .targetCompletionDate(record.getTargetCompletionDate())
                .actualCompletionDate(record.getActualCompletionDate())
                .isOverdue(overdue)
                .effectivenessCriteria(record.getEffectivenessCriteria())
                .effectivenessTargetDate(record.getEffectivenessTargetDate())
                .effectivenessReviewedDate(record.getEffectivenessReviewedDate())
                .effectivenessReviewedBy(record.getEffectivenessReviewedBy())
                .effectivenessResult(record.getEffectivenessResult())
                .effectivenessResultDescription(record.getEffectivenessResult() != null ? record.getEffectivenessResult().getDescription() : null)
                .effectivenessResultColor(record.getEffectivenessResult() != null ? record.getEffectivenessResult().getColor() : null)
                .effectivenessEvidence(record.getEffectivenessEvidence())
                .followUpActionRequired(record.getFollowUpActionRequired())
                .closureComment(record.getClosureComment())
                .closedBy(record.getClosedBy())
                .closedDate(record.getClosedDate())
                .actionItemCount(items.size())
                .completedActionItemCount(completedCount)
                .actionItems(items)
                .createdBy(record.getCreatedBy())
                .updatedBy(record.getUpdatedBy())
                .createdAt(record.getCreatedAt())
                .updatedAt(record.getUpdatedAt())
                .version(record.getVersion())
                .build();
    }
}
