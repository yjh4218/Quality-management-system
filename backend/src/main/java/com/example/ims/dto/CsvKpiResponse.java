package com.example.ims.dto;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CsvKpiResponse {
    private long totalProjects;
    private long totalProtocols;
    private long passedProtocols;
    private double passRate;
    private long openDefects;
    private long acceptedRisks;
    private String goLiveStatus;
    private double goLiveReadinessRate;
}
