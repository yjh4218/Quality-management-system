package com.example.ims.dto;

import com.example.ims.entity.ManagementReviewStatus;
import com.example.ims.entity.ManagementReviewType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ManagementReviewRequest {

    @NotBlank(message = "경영검토 안건/제목은 필수입니다.")
    private String title;

    @NotNull(message = "경영검토 유형은 필수입니다.")
    private ManagementReviewType reviewType;

    @NotNull(message = "회의 일자는 필수입니다.")
    private LocalDate reviewDate;

    @NotBlank(message = "주관자(대표이사/품질책임자)는 필수입니다.")
    private String chairpersonName;

    @NotBlank(message = "참석자 명단은 필수입니다.")
    private String attendees;

    private ManagementReviewStatus status;

    // 12대 입력요소
    private String auditResultsSummary;
    private String customerFeedbackSummary;
    private String processPerformanceSummary;
    private String capaStatusSummary;
    private String previousFollowUpSummary;
    private String regulatoryChangesSummary;
    private String recommendationsSummary;

    // 3대 출력요소
    private String qmsImprovementDecisions;
    private String productImprovementDecisions;
    private String resourceAllocationDecisions;

    private LocalDate nextReviewDueDate;
    private String approvedBy;
    private LocalDate approvedDate;
    private String minutesFileUrl;
}
