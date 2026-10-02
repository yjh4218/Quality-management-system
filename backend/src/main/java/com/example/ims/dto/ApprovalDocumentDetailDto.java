package com.example.ims.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ApprovalDocumentDetailDto {
    private Long id;
    private Long docTypeId;
    private String docTypeCode;
    private String docTypeName;
    private Long sourceRecordId;
    private Long templateId;
    private String title;
    private String status;
    private Long submittedById;
    private String submittedByUsername;
    private String submittedByName;
    private String submittedByDepartment;
    private String submittedByCompanyName;
    private LocalDateTime submittedAt;
    private LocalDateTime completedAt;
    private Long parentDocumentId;
    private LocalDateTime createdAt;
    private List<ApprovalStepInstanceDto> steps;
    private List<ApprovalHistoryLogDto> historyLogs;
    private Boolean canApprove;
    private Boolean canReject;
    private Boolean canRecall;
    private Boolean canResubmit;
    private String content;
    private String retentionPeriod;
}
