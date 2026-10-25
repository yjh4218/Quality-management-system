package com.example.ims.dto;

import com.example.ims.entity.AuditChecklist;
import com.example.ims.entity.ChecklistResult;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AuditChecklistResponse {

    private Long id;
    private Long internalAuditId;
    private String auditNumber;
    private String clauseNumber;
    private String checkpoint;
    private String auditMethod;
    private String evidenceNotes;
    private ChecklistResult result;
    private String resultDescription;
    private String auditedBy;
    private LocalDate auditedDate;
    private String remarks;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private String createdBy;
    private String lastModifiedBy;

    public static AuditChecklistResponse fromEntity(AuditChecklist checklist) {
        if (checklist == null) return null;
        return AuditChecklistResponse.builder()
                .id(checklist.getId())
                .internalAuditId(checklist.getInternalAudit() != null ? checklist.getInternalAudit().getId() : null)
                .auditNumber(checklist.getInternalAudit() != null ? checklist.getInternalAudit().getAuditNumber() : null)
                .clauseNumber(checklist.getClauseNumber())
                .checkpoint(checklist.getCheckpoint())
                .auditMethod(checklist.getAuditMethod())
                .evidenceNotes(checklist.getEvidenceNotes())
                .result(checklist.getResult())
                .resultDescription(checklist.getResult() != null ? checklist.getResult().getDescription() : null)
                .auditedBy(checklist.getAuditedBy())
                .auditedDate(checklist.getAuditedDate())
                .remarks(checklist.getRemarks())
                .createdAt(checklist.getCreatedAt())
                .updatedAt(checklist.getUpdatedAt())
                .createdBy(checklist.getCreatedBy())
                .lastModifiedBy(checklist.getLastModifiedBy())
                .build();
    }
}
