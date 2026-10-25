package com.example.ims.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class NcrCloseRequest {

    @NotBlank(message = "종결 검토 및 확인 의견은 필수입니다.")
    private String closureRemarks;
}
