package com.example.ims.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ComplaintCloseRequest {

    @NotBlank(message = "종결 승인자 성명은 필수입니다.")
    private String closedBy;

    @NotBlank(message = "종결 종합 소견은 필수입니다.")
    private String closureRemarks;
}
