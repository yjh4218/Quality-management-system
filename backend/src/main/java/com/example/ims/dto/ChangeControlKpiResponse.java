package com.example.ims.dto;

import lombok.*;

import java.util.Map;

/**
 * 🔄 변경관리 6대 KPI 요약 및 분석 통계 응답 DTO
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChangeControlKpiResponse {

    private long totalChanges;                // 전체 변경 건수
    private long activeChanges;               // 진행 중 변경 건수
    private long ccbPendingCount;             // CCB 심의 대기 건수
    private double effectivenessPassRate;     // 효과성 검증 적합률 (%)
    private long emergencyCount;              // 긴급 변경 건수
    private long closedChanges;               // 종결 완료 건수

    private Map<String, Long> categoryDistribution;     // 카테고리별 분포
    private Map<String, Long> statusDistribution;       // 8단계 상태별 분포
    private Map<String, Long> urgencyDistribution;      // 긴급도별 분포
}
