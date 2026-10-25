package com.example.ims.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.time.LocalDate;

/**
 * ⚠️ ISO 14971 위험성 평가 등록 및 수정 요청 DTO
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RiskAssessmentRequest {

    private String assessmentNo;

    @NotBlank(message = "평가 제목은 필수입니다.")
    private String title;

    private Long productId;

    private String productCode;

    @NotBlank(message = "대상 품목명은 필수입니다.")
    private String productName;

    private String targetFamily; // MEDICAL_DEVICE, IVD, COMBINATION, COSMETICS_DEVICE

    @NotBlank(message = "위험관리 단계는 필수입니다.")
    private String riskPhase; // DESIGN, PROCESS, USE, POST_MARKET

    private String versionTag; // 1.0, 1.1, etc.

    private String status; // DRAFT, REVIEW, APPROVED, OBSOLETE

    @NotBlank(message = "작성자는 필수입니다.")
    private String author;

    private String reviewer;

    private String approver;

    @NotNull(message = "평가 기준일자는 필수입니다.")
    private LocalDate assessmentDate;

    private LocalDate approvalDate;

    private String scopeDescription;

    private Boolean overallResidualRiskAcceptable;

    private String overallConclusion;
}
