package com.example.ims.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

/**
 * ⚠️ ISO 14971 위해요인(Hazard) 및 FMEA 통제 조치 요청 DTO
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RiskHazardItemRequest {

    private String itemNo;

    @NotBlank(message = "위험 분류는 필수입니다.")
    private String category; // BIO_SAFETY, ELECTRICAL, SOFTWARE, MECHANICAL, USABILITY, RAW_MATERIAL, ENVIRONMENTAL

    @NotBlank(message = "위해요인(Hazard)은 필수입니다.")
    private String hazard;

    @NotBlank(message = "위해상황(Hazardous Situation)은 필수입니다.")
    private String hazardousSituation;

    @NotBlank(message = "피해(Harm)는 필수입니다.")
    private String harm;

    @NotNull(message = "초기 심각도는 필수입니다.")
    @Min(1) @Max(5)
    private Integer initialSeverity;

    @NotNull(message = "초기 발생확률은 필수입니다.")
    @Min(1) @Max(5)
    private Integer initialProbability;

    @NotBlank(message = "통제 조치 유형은 필수입니다.")
    private String controlCategory; // INHERENT_SAFETY, PROTECTIVE_MEASURES, INFORMATION_FOR_SAFETY

    @NotBlank(message = "위험 통제 조치 내용은 필수입니다.")
    private String controlMeasures;

    private String controlStatus; // PENDING, IN_PROGRESS, COMPLETED, VERIFIED

    private String verificationMethod;

    private String verificationResult; // PASS, CONDITIONAL, FAIL

    @NotNull(message = "잔여 심각도는 필수입니다.")
    @Min(1) @Max(5)
    private Integer residualSeverity;

    @NotNull(message = "잔여 발생확률은 필수입니다.")
    @Min(1) @Max(5)
    private Integer residualProbability;

    private Boolean benefitRiskNeeded;

    private String benefitRiskSummary;

    private String remarks;
}
