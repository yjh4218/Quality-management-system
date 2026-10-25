package com.example.ims.dto;

import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CsvGoLiveResponse {
    private Long id;
    private Long projectId;
    private String projectCode;
    private String projectName;
    private String releaseVersion;
    private String approvalTitle;
    private String systemOwnerName;
    private LocalDateTime systemOwnerSignedAt;
    private String systemOwnerSignatureNumber;
    private String qaLeadName;
    private LocalDateTime qaLeadSignedAt;
    private String qaLeadSignatureNumber;
    private String executiveName;
    private LocalDateTime executiveSignedAt;
    private String executiveSignatureNumber;
    private String finalApprovalStatus;
    private LocalDate goLiveDate;
    private String contingencyPlan;
    private String authorizedNotes;
    private Boolean isFullySigned;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
