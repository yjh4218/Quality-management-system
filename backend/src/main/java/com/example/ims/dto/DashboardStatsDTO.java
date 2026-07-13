package com.example.ims.dto;

import lombok.Builder;
import lombok.Getter;

import java.util.Map;

@Getter
@Builder
public class DashboardStatsDTO {
    private double qualityPassRate;
    private long qualityTotal;
    private long claimCountThisMonth;
    private Map<String, Long> claimByCategory;
    private Map<String, Long> auditGradeDistribution;
    private Map<String, Long> productionAuditStatus;
}
