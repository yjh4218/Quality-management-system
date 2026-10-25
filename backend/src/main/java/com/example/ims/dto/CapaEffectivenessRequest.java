package com.example.ims.dto;

import com.example.ims.entity.EffectivenessResult;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CapaEffectivenessRequest {

    @NotNull(message = "효과성 평가 결과는 필수입니다.")
    private EffectivenessResult effectivenessResult;

    @NotBlank(message = "효과성 객관적 입증 증거/데이터는 필수입니다.")
    private String effectivenessEvidence;

    private Boolean followUpActionRequired;
}
