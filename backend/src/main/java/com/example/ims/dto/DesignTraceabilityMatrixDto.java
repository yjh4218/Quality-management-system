package com.example.ims.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 요구사항 추적성 매트릭스 (Requirements Traceability Matrix - RTM)
 * 입력(DI) ↔ 출력(DO) ↔ 검증(DV) ↔ 유효성확인(VAL) ↔ 위험요인(Hazard) 5단 연계 DTO
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DesignTraceabilityMatrixDto {

    private String inputItemCode;
    private String inputTitle;
    private String inputSpecification;

    private String outputItemCode;
    private String outputTitle;

    private String verificationItemCode;
    private String verificationMethod;
    private String verificationResult;

    private String validationItemCode;
    private String validationResult;

    private String riskHazardCode;

    private boolean fullyTraced;
}
