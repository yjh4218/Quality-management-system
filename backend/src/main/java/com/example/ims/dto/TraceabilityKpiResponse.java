package com.example.ims.dto;

import lombok.*;

import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TraceabilityKpiResponse {

    private long totalBatches;              // 총 관리 LOT 수
    private long finishedGoodsBatches;       // 완제품/출하 LOT 수
    private long rawMaterialBatches;        // 원료/포장재 LOT 수
    private BigDecimal traceabilityIntegrityRate; // 양방향 추적 무결성 (%)
    private BigDecimal integrationSuccessRate;    // 외부연계 성공률 (%)
    private long pendingReconciliationCount;     // 대사 요망/불일치 건수
}
