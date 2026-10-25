package com.example.ims.dto;

import com.example.ims.entity.AuditFinding;
import com.example.ims.entity.FindingClassification;
import com.example.ims.entity.FindingStatus;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AuditFindingResponse {

    private Long id;
    private String findingNumber;
    private Long internalAuditId;
    private String auditNumber;
    private String auditTitle;
    private Long auditChecklistId;
    private String clauseNumber;
    private FindingClassification classification;
    private String classificationDescription;
    private FindingStatus status;
    private String statusDescription;
    private String findingDetails;
    private String requirementCriteria;
    private String auditeeActionPlan;
    private LocalDate actionDueDate;
    private LocalDate actionCompletedDate;
    private String capaNumber;
    private String verifiedBy;
    private LocalDate verifiedDate;
    private String verificationNotes;
    private boolean isDeleted;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private String createdBy;
    private String lastModifiedBy;

    public static AuditFindingResponse fromEntity(AuditFinding finding) {
        if (finding == null) return null;
        return AuditFindingResponse.builder()
                .id(finding.getId())
                .findingNumber(finding.getFindingNumber())
                .internalAuditId(finding.getInternalAudit() != null ? finding.getInternalAudit().getId() : null)
                .auditNumber(finding.getInternalAudit() != null ? finding.getInternalAudit().getAuditNumber() : null)
                .auditTitle(finding.getInternalAudit() != null ? finding.getInternalAudit().getTitle() : null)
                .auditChecklistId(finding.getAuditChecklist() != null ? finding.getAuditChecklist().getId() : null)
                .clauseNumber(finding.getClauseNumber())
                .classification(finding.getClassification())
                .classificationDescription(finding.getClassification() != null ? finding.getClassification().getDescription() : null)
                .status(finding.getStatus())
                .statusDescription(finding.getStatus() != null ? finding.getStatus().getDescription() : null)
                .findingDetails(finding.getFindingDetails())
                .requirementCriteria(finding.getRequirementCriteria())
                .auditeeActionPlan(finding.getAuditeeActionPlan())
                .actionDueDate(finding.getActionDueDate())
                .actionCompletedDate(finding.getActionCompletedDate())
                .capaNumber(finding.getCapaNumber())
                .verifiedBy(finding.getVerifiedBy())
                .verifiedDate(finding.getVerifiedDate())
                .verificationNotes(finding.getVerificationNotes())
                .isDeleted(finding.isDeleted())
                .createdAt(finding.getCreatedAt())
                .updatedAt(finding.getUpdatedAt())
                .createdBy(finding.getCreatedBy())
                .lastModifiedBy(finding.getLastModifiedBy())
                .build();
    }
}
