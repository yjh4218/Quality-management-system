package com.example.ims.dto;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class InternalAuditKpiResponse {

    private long annualPlannedAudits;
    private long completedAudits;
    private double auditExecutionRate;
    private long inProgressAudits;
    private long openFindings;
    private long criticalMajorFindings;
    private long capaLinkedFindings;
    private boolean recentReviewApproved;
    private String nextReviewDueDate;
}
