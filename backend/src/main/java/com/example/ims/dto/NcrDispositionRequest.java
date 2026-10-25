package com.example.ims.dto;

import com.example.ims.entity.NcrDispositionType;
import jakarta.validation.constraints.NotNull;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class NcrDispositionRequest {

    @NotNull(message = "처리(Disposition) 방안은 필수입니다.")
    private NcrDispositionType dispositionType;

    private String dispositionDetails;

    private String reworkInstructions; // 재작업 선택 시 필수

    private String concessionJustification; // 특채/양보 선택 시 타당성 근거 필수

    private Boolean capaRequired;
    private String capaReferenceId;
    private String capaRationale;
}
