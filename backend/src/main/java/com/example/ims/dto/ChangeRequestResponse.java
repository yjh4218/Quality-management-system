package com.example.ims.dto;

import com.example.ims.entity.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

/**
 * 🔄 변경요청서 상세 응답 DTO
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChangeRequestResponse {

    private Long id;
    private Long version;
    private String changeNumber;
    private String title;
    private ChangeCategory category;
    private String categoryDescription;
    private ChangeUrgency urgency;
    private String urgencyDescription;
    private ChangeStatus status;
    private String statusDescription;

    private String targetItemName;
    private String itemCode;
    private String initiatorName;
    private String department;
    private LocalDate requestDate;
    private LocalDate targetCompletionDate;
    private LocalDate actualCompletionDate;

    private String changeReason;
    private String currentState;
    private String proposedChange;

    // 영향평가
    private Boolean regulatoryImpact;
    private String regulatoryDetails;
    private Boolean qualitySafetyImpact;
    private String qualityDetails;
    private Boolean validationRequired;
    private String validationDetails;

    // 양방향 추적성 연계
    private Long riskAssessmentId;
    private String riskAssessmentCode;
    private Long dmsDocumentId;
    private String dmsDocumentNumber;
    private Long designProjectId;
    private String designProjectCode;

    // CCB 심의
    private LocalDate ccbReviewDate;
    private String ccbAttendees;
    private String ccbSummary;
    private CcbDecision ccbDecision;
    private String ccbDecisionDescription;
    private String ccbConditions;

    // 효과성 검증
    private Boolean effectivenessRequired;
    private LocalDate effectivenessDueDate;
    private LocalDate effectivenessEvalDate;
    private EffectivenessStatus effectivenessStatus;
    private String effectivenessStatusDescription;
    private String effectivenessSummary;
    private String evaluatorName;

    // 조치 항목 집계
    private Integer totalActionItemsCount;
    private Integer completedActionItemsCount;
    private Double actionProgressPercent;

    @Builder.Default
    private List<ChangeActionItemResponse> actionItems = new ArrayList<>();

    // 감사추적
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private String createdBy;
    private String updatedBy;

    public static ChangeRequestResponse fromEntity(ChangeRequest entity) {
        if (entity == null) return null;

        List<ChangeActionItemResponse> items = entity.getActionItems() != null ?
                entity.getActionItems().stream()
                        .filter(i -> !Boolean.TRUE.equals(i.getIsDeleted()))
                        .map(ChangeActionItemResponse::fromEntity)
                        .collect(Collectors.toList()) : new ArrayList<>();

        int totalItems = items.size();
        long completed = items.stream().filter(i -> "COMPLETED".equalsIgnoreCase(i.getStatus())).count();
        double progress = totalItems > 0 ? Math.round((completed * 100.0 / totalItems) * 10.0) / 10.0 : 0.0;

        return ChangeRequestResponse.builder()
                .id(entity.getId())
                .version(entity.getVersion())
                .changeNumber(entity.getChangeNumber())
                .title(entity.getTitle())
                .category(entity.getCategory())
                .categoryDescription(entity.getCategory() != null ? entity.getCategory().getDescription() : "")
                .urgency(entity.getUrgency())
                .urgencyDescription(entity.getUrgency() != null ? entity.getUrgency().getDescription() : "")
                .status(entity.getStatus())
                .statusDescription(entity.getStatus() != null ? entity.getStatus().getDescription() : "")
                .targetItemName(entity.getTargetItemName())
                .itemCode(entity.getItemCode())
                .initiatorName(entity.getInitiatorName())
                .department(entity.getDepartment())
                .requestDate(entity.getRequestDate())
                .targetCompletionDate(entity.getTargetCompletionDate())
                .actualCompletionDate(entity.getActualCompletionDate())
                .changeReason(entity.getChangeReason())
                .currentState(entity.getCurrentState())
                .proposedChange(entity.getProposedChange())
                .regulatoryImpact(entity.getRegulatoryImpact())
                .regulatoryDetails(entity.getRegulatoryDetails())
                .qualitySafetyImpact(entity.getQualitySafetyImpact())
                .qualityDetails(entity.getQualityDetails())
                .validationRequired(entity.getValidationRequired())
                .validationDetails(entity.getValidationDetails())
                .riskAssessmentId(entity.getRiskAssessmentId())
                .riskAssessmentCode(entity.getRiskAssessmentCode())
                .dmsDocumentId(entity.getDmsDocumentId())
                .dmsDocumentNumber(entity.getDmsDocumentNumber())
                .designProjectId(entity.getDesignProjectId())
                .designProjectCode(entity.getDesignProjectCode())
                .ccbReviewDate(entity.getCcbReviewDate())
                .ccbAttendees(entity.getCcbAttendees())
                .ccbSummary(entity.getCcbSummary())
                .ccbDecision(entity.getCcbDecision())
                .ccbDecisionDescription(entity.getCcbDecision() != null ? entity.getCcbDecision().getDescription() : "")
                .ccbConditions(entity.getCcbConditions())
                .effectivenessRequired(entity.getEffectivenessRequired())
                .effectivenessDueDate(entity.getEffectivenessDueDate())
                .effectivenessEvalDate(entity.getEffectivenessEvalDate())
                .effectivenessStatus(entity.getEffectivenessStatus())
                .effectivenessStatusDescription(entity.getEffectivenessStatus() != null ? entity.getEffectivenessStatus().getDescription() : "")
                .effectivenessSummary(entity.getEffectivenessSummary())
                .evaluatorName(entity.getEvaluatorName())
                .totalActionItemsCount(totalItems)
                .completedActionItemsCount((int) completed)
                .actionProgressPercent(progress)
                .actionItems(items)
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .createdBy(entity.getCreatedBy())
                .updatedBy(entity.getUpdatedBy())
                .build();
    }
}
