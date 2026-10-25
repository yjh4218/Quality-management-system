package com.example.ims.dto;

import jakarta.validation.constraints.NotNull;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ComplaintInvestigationRequest {

    @NotNull(message = "원인조사 실시 여부는 필수입니다.")
    private Boolean investigationRequired;

    private String noInvestigationReason;
    private String investigationSummary;

    private Boolean capaRequired;
    private String capaRationale;
    private String capaNumber;
}
