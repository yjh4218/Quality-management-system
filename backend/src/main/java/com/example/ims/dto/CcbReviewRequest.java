package com.example.ims.dto;

import com.example.ims.entity.CcbDecision;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.time.LocalDate;

/**
 * 🔄 CCB(Change Control Board) 심의 및 승인 요청 DTO
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CcbReviewRequest {

    @NotNull(message = "CCB 심의 일자는 필수입니다.")
    private LocalDate ccbReviewDate;

    @NotBlank(message = "CCB 참석자 명단은 필수입니다.")
    private String ccbAttendees;

    @NotBlank(message = "CCB 심의 요약은 필수입니다.")
    private String ccbSummary;

    @NotNull(message = "CCB 의결 판정은 필수입니다.")
    private CcbDecision ccbDecision;

    private String ccbConditions;
}
