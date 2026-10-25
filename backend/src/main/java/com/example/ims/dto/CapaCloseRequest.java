package com.example.ims.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CapaCloseRequest {

    @NotBlank(message = "최종 종결 검토 의견은 필수입니다.")
    private String closureComment;
}
