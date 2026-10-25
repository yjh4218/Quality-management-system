package com.example.ims.dto;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class VigilanceRecallKpiResponse {

    // Vigilance KPIs
    private long totalVigilanceReports;
    private long draftReports;
    private long overdueReports;
    private long dueSoonReports;
    private long submittedReports;
    private long capaLinkedReports;

    // Recall KPIs
    private long totalRecalls;
    private long activeRecalls;
    private long completedRecalls;
    private long class1Recalls;
    private double avgRecoveryRate;
}
