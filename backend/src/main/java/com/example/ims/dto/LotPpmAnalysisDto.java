package com.example.ims.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LotPpmAnalysisDto {

    public enum LotPpmStatus {
        NORMAL,                // 정상
        INSUFFICIENT_SAMPLE,   // 샘플 부족 (판단 보류)
        STATISTICAL_ANOMALY    // 통계적 이상 (LOT 원인 가능성 높음)
    }

    private String itemCode;
    private String productName;
    private String masterProductName;
    private String lotNumber;
    private long inboundQty;
    private long claimQty;
    private int claimCount;
    private double ppm;
    private double baselinePpm;
    private double zScore;
    private LotPpmStatus status;
    private String statusMessage;
}
