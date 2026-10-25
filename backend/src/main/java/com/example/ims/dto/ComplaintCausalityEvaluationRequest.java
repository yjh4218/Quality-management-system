package com.example.ims.dto;

import com.example.ims.entity.CausalityGrade;
import com.example.ims.entity.ReportabilityStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ComplaintCausalityEvaluationRequest {

    @NotNull(message = "인과관계 평가 등급은 필수입니다.")
    private CausalityGrade causalityGrade;

    @NotBlank(message = "인과관계 판단 근거는 필수입니다.")
    private String causalityRationale;

    private Boolean isSerious;
    private String seriousReason;

    private ReportabilityStatus reportabilityStatus;
    private LocalDate reportDeadline;

    private Boolean capaRequired;
    private String capaRationale;
}
