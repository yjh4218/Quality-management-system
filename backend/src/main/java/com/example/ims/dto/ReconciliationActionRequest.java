package com.example.ims.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReconciliationActionRequest {

    @NotBlank(message = "대사 검토 의견은 필수입니다.")
    private String reconciliationNotes;
}
