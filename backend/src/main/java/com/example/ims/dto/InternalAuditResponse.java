package com.example.ims.dto;

import com.example.ims.entity.AuditScope;
import com.example.ims.entity.AuditStatus;
import com.example.ims.entity.AuditType;
import com.example.ims.entity.InternalAudit;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class InternalAuditResponse {

    private Long id;
    private String auditNumber;
    private String title;
    private AuditType auditType;
    private String auditTypeDescription;
    private AuditScope auditScope;
    private String auditScopeDescription;
    private String criteria;
    private LocalDate plannedStartDate;
    private LocalDate plannedEndDate;
    private LocalDate actualStartDate;
    private LocalDate actualEndDate;
    private String auditeeDepartment;
    private String auditeeLeadName;
    private String leadAuditorName;
    private String leadAuditorDepartment;
    private String auditTeamMembers;
    private AuditStatus status;
    private String statusDescription;
    private String summaryConclusion;
    private String approvedBy;
    private LocalDate approvedDate;
    private boolean isDeleted;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private String createdBy;
    private String lastModifiedBy;

    private int checklistCount;
    private int findingCount;
    private int criticalMajorFindingCount;

    public static InternalAuditResponse fromEntity(InternalAudit audit) {
        if (audit == null) return null;
        int checkCount = audit.getChecklists() != null ? audit.getChecklists().size() : 0;
        int findCount = audit.getFindings() != null ? audit.getFindings().size() : 0;
        int cmCount = audit.getFindings() != null ? (int) audit.getFindings().stream()
                .filter(f -> f.getClassification() != null && 
                        (f.getClassification().name().equals("CRITICAL") || f.getClassification().name().equals("MAJOR")))
                .count() : 0;

        return InternalAuditResponse.builder()
                .id(audit.getId())
                .auditNumber(audit.getAuditNumber())
                .title(audit.getTitle())
                .auditType(audit.getAuditType())
                .auditTypeDescription(audit.getAuditType() != null ? audit.getAuditType().getDescription() : null)
                .auditScope(audit.getAuditScope())
                .auditScopeDescription(audit.getAuditScope() != null ? audit.getAuditScope().getDescription() : null)
                .criteria(audit.getCriteria())
                .plannedStartDate(audit.getPlannedStartDate())
                .plannedEndDate(audit.getPlannedEndDate())
                .actualStartDate(audit.getActualStartDate())
                .actualEndDate(audit.getActualEndDate())
                .auditeeDepartment(audit.getAuditeeDepartment())
                .auditeeLeadName(audit.getAuditeeLeadName())
                .leadAuditorName(audit.getLeadAuditorName())
                .leadAuditorDepartment(audit.getLeadAuditorDepartment())
                .auditTeamMembers(audit.getAuditTeamMembers())
                .status(audit.getStatus())
                .statusDescription(audit.getStatus() != null ? audit.getStatus().getDescription() : null)
                .summaryConclusion(audit.getSummaryConclusion())
                .approvedBy(audit.getApprovedBy())
                .approvedDate(audit.getApprovedDate())
                .isDeleted(audit.isDeleted())
                .createdAt(audit.getCreatedAt())
                .updatedAt(audit.getUpdatedAt())
                .createdBy(audit.getCreatedBy())
                .lastModifiedBy(audit.getLastModifiedBy())
                .checklistCount(checkCount)
                .findingCount(findCount)
                .criticalMajorFindingCount(cmCount)
                .build();
    }
}
