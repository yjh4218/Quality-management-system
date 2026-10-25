package com.example.ims.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class NcrInvestigationRequest {

    @NotBlank(message = "근본 원인 분석 내용은 필수입니다.")
    private String rootCauseAnalysis;

    private Boolean capaRequired;
    private String capaRationale;
}
