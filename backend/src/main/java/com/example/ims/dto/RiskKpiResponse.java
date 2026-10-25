package com.example.ims.dto;

import lombok.*;

import java.util.Map;

/**
 * ⚠️ ISO 14971 위험관리 종합 KPI 통계 및 5x5 FMEA 매트릭스 집계 응답 DTO
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RiskKpiResponse {

    private long totalAssessments;
    private long totalHazards;
    private long completedControls;
    private long unacceptableRisks;
    private double residualAcceptableRate;
    private long pendingReviewCount;

    /**
     * 5x5 FMEA 초기 위험 매트릭스 좌표 집계 (key: "S{sev}_P{prob}")
     */
    private Map<String, Integer> initialMatrix;

    /**
     * 5x5 FMEA 통제 후 잔여 위험 매트릭스 좌표 집계 (key: "S{sev}_P{prob}")
     */
    private Map<String, Integer> residualMatrix;
}
