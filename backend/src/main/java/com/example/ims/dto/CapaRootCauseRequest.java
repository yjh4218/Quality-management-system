package com.example.ims.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CapaRootCauseRequest {

    @NotBlank(message = "근본원인 종합 분석 내용은 필수입니다.")
    private String rootCauseAnalysis;

    // 5-Why
    private String why1;
    private String why2;
    private String why3;
    private String why4;
    private String why5;

    // Fishbone 6M
    private String fishboneMan;
    private String fishboneMachine;
    private String fishboneMaterial;
    private String fishboneMethod;
    private String fishboneMeasurement;
    private String fishboneEnvironment;
}
