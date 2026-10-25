package com.example.ims.dto;

import com.example.ims.entity.EffectivenessStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.time.LocalDate;

/**
 * 🔄 변경 효과성 검증 평가 요청 DTO
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChangeEffectivenessRequest {

    @NotNull(message = "효과성 평가 일자는 필수입니다.")
    private LocalDate effectivenessEvalDate;

    @NotNull(message = "효과성 판정 상태는 필수입니다.")
    private EffectivenessStatus effectivenessStatus;

    @NotBlank(message = "효과성 평가 요약은 필수입니다.")
    private String effectivenessSummary;

    @NotBlank(message = "평가자 성명은 필수입니다.")
    private String evaluatorName;
}
