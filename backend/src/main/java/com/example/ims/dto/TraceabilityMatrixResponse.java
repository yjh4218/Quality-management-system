package com.example.ims.dto;

import lombok.*;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TraceabilityMatrixResponse {

    private String queryBatchNumber;
    private String queryDirection; // FORWARD (정방향: 원자재->완제품->출하), BACKWARD (역방향: 완제품->원자재)
    private TraceabilityTreeNode rootNode;
    private int totalRelatedBatches;
    private BigDecimal traceabilityCoverageRate; // %
    private String generatedAt;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class TraceabilityTreeNode {
        private String batchNumber;
        private String batchStage;
        private String batchStageDesc;
        private String itemCode;
        private String itemName;
        private String specification;
        private BigDecimal quantity;
        private String unit;
        private String qualityStatus;
        private String qualityStatusDesc;
        private String qualityStatusColor;
        private String supplierOrManufacturer;
        private String processStep;
        private BigDecimal inputQuantity;
        private BigDecimal yieldRatio;
        private int depth;

        @Builder.Default
        private List<TraceabilityTreeNode> children = new ArrayList<>();
    }
}
