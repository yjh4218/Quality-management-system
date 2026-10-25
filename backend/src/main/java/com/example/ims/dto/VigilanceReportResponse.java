package com.example.ims.dto;

import com.example.ims.entity.AuthorityType;
import com.example.ims.entity.IncidentSeverity;
import com.example.ims.entity.ProductRegulatoryType;
import com.example.ims.entity.VigilanceReport;
import com.example.ims.entity.VigilanceReportClassification;
import com.example.ims.entity.VigilanceSourceType;
import com.example.ims.entity.VigilanceSubmissionStatus;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class VigilanceReportResponse {

    private Long id;
    private String reportNumber;
    private String title;
    private AuthorityType authorityType;
    private String authorityTypeName;
    private ProductRegulatoryType regulatoryType;
    private String regulatoryTypeName;
    private VigilanceReportClassification reportClassification;
    private String reportClassificationDescription;
    private IncidentSeverity incidentSeverity;
    private String incidentSeverityDescription;
    private VigilanceSourceType sourceType;
    private String sourceTypeName;
    private Long sourceId;
    private String sourceNumber;
    private String sourceDescription;

    private String itemCode;
    private String productName;
    private String lotNumber;
    private Boolean isLotUnknown;

    private LocalDate awarenessDate;
    private LocalDate dueDate;
    private LocalDate submissionDate;
    private VigilanceSubmissionStatus submissionStatus;
    private String submissionStatusName;
    private String authoritySubmissionNumber;

    // D-Day 계산 (제출 전인 경우 마감일까지 남은 일수, 마감 초과 시 음수)
    private Long daysRemaining;
    private Boolean isOverdue;

    private String incidentDescription;
    private String patientImpact;
    private String preliminaryCausality;
    private String reporterName;
    private String reportedToDepartment;
    private String actionTaken;

    private Boolean capaRequired;
    private Long capaId;
    private String capaNumber;

    private String createdBy;
    private String updatedBy;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static VigilanceReportResponse fromEntity(VigilanceReport entity) {
        LocalDate today = LocalDate.now();
        Long daysRemaining = null;
        boolean isOverdue = false;

        if (entity.getDueDate() != null) {
            daysRemaining = ChronoUnit.DAYS.between(today, entity.getDueDate());
            if (entity.getSubmissionStatus() == VigilanceSubmissionStatus.DRAFT && daysRemaining < 0) {
                isOverdue = true;
            }
        }

        return VigilanceReportResponse.builder()
                .id(entity.getId())
                .reportNumber(entity.getReportNumber())
                .title(entity.getTitle())
                .authorityType(entity.getAuthorityType())
                .authorityTypeName(entity.getAuthorityType() != null ? entity.getAuthorityType().name() : null)
                .regulatoryType(entity.getRegulatoryType())
                .regulatoryTypeName(entity.getRegulatoryType() != null ? entity.getRegulatoryType().getDescription() : null)
                .reportClassification(entity.getReportClassification())
                .reportClassificationDescription(entity.getReportClassification() != null ? entity.getReportClassification().getDescription() : null)
                .incidentSeverity(entity.getIncidentSeverity())
                .incidentSeverityDescription(entity.getIncidentSeverity() != null ? entity.getIncidentSeverity().getDescription() : null)
                .sourceType(entity.getSourceType())
                .sourceTypeName(entity.getSourceType() != null ? entity.getSourceType().name() : null)
                .sourceId(entity.getSourceId())
                .sourceNumber(entity.getSourceNumber())
                .sourceDescription(entity.getSourceDescription())
                .itemCode(entity.getItemCode())
                .productName(entity.getProductName())
                .lotNumber(entity.getLotNumber())
                .isLotUnknown(entity.getIsLotUnknown())
                .awarenessDate(entity.getAwarenessDate())
                .dueDate(entity.getDueDate())
                .submissionDate(entity.getSubmissionDate())
                .submissionStatus(entity.getSubmissionStatus())
                .submissionStatusName(entity.getSubmissionStatus() != null ? entity.getSubmissionStatus().getDescription() : null)
                .authoritySubmissionNumber(entity.getAuthoritySubmissionNumber())
                .daysRemaining(daysRemaining)
                .isOverdue(isOverdue)
                .incidentDescription(entity.getIncidentDescription())
                .patientImpact(entity.getPatientImpact())
                .preliminaryCausality(entity.getPreliminaryCausality())
                .reporterName(entity.getReporterName())
                .reportedToDepartment(entity.getReportedToDepartment())
                .actionTaken(entity.getActionTaken())
                .capaRequired(entity.getCapaRequired())
                .capaId(entity.getCapaId())
                .capaNumber(entity.getCapaNumber())
                .createdBy(entity.getCreatedBy())
                .updatedBy(entity.getUpdatedBy())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }
}
