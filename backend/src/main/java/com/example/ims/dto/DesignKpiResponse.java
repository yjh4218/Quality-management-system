package com.example.ims.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DesignKpiResponse {

    private long totalProjects;
    private long activeProjects;
    private double overallVerificationPassRate;
    private double overallTraceabilityRate;
    private long openDhfCount;
    private long frozenDhfCount;
    private long pendingReviewCount;
    private long totalControlItems;

    private Map<String, Long> phaseDistribution;
    private Map<String, Long> statusDistribution;
    private Map<String, Long> verificationResultDistribution;
}
