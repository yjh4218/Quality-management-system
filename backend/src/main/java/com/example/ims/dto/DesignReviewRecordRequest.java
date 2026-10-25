package com.example.ims.dto;

import com.example.ims.entity.DesignPhase;
import com.example.ims.entity.GateDecision;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DesignReviewRecordRequest {

    private String reviewNumber;

    @NotNull(message = "심의 단계는 필수입니다.")
    private DesignPhase reviewPhase;

    @NotBlank(message = "심의 제목은 필수입니다.")
    private String reviewTitle;

    @NotNull(message = "심의 일자는 필수입니다.")
    private LocalDate reviewDate;

    @NotBlank(message = "참석자 명단은 필수입니다.")
    private String attendees;

    @NotBlank(message = "심의 내용은 필수입니다.")
    private String reviewSummary;

    private String actionItems;

    @NotNull(message = "게이트 결정은 필수입니다.")
    private GateDecision gateDecision;

    private Long approvalDocumentId;
}
