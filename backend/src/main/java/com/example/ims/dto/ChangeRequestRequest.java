package com.example.ims.dto;

import com.example.ims.entity.ChangeCategory;
import com.example.ims.entity.ChangeStatus;
import com.example.ims.entity.ChangeUrgency;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.time.LocalDate;

/**
 * 🔄 변경요청서 등록/수정 요청 DTO
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChangeRequestRequest {

    private String changeNumber; // 비어있으면 자동채번 CR-yyyyMM-xxx

    @NotBlank(message = "변경 제목은 필수입니다.")
    private String title;

    @NotNull(message = "변경 대상 분류는 필수입니다.")
    private ChangeCategory category;

    @Builder.Default
    private ChangeUrgency urgency = ChangeUrgency.STANDARD;

    @Builder.Default
    private ChangeStatus status = ChangeStatus.DRAFT;

    private String targetItemName;
    private String itemCode;

    @NotBlank(message = "기안자 성명은 필수입니다.")
    private String initiatorName;

    @NotBlank(message = "기안 부서는 필수입니다.")
    private String department;

    @NotNull(message = "기안 일자는 필수입니다.")
    private LocalDate requestDate;

    private LocalDate targetCompletionDate;
    private LocalDate actualCompletionDate;

    @NotBlank(message = "변경 사유 및 배경은 필수입니다.")
    private String changeReason;

    @NotBlank(message = "변경 전 현황(As-Is)은 필수입니다.")
    private String currentState;

    @NotBlank(message = "변경 후 사양(To-Be)은 필수입니다.")
    private String proposedChange;

    // 영향평가
    @Builder.Default
    private Boolean regulatoryImpact = false;
    private String regulatoryDetails;

    @Builder.Default
    private Boolean qualitySafetyImpact = false;
    private String qualityDetails;

    @Builder.Default
    private Boolean validationRequired = false;
    private String validationDetails;

    // 양방향 추적성 연계
    private Long riskAssessmentId;
    private String riskAssessmentCode;
    private Long dmsDocumentId;
    private String dmsDocumentNumber;
    private Long designProjectId;
    private String designProjectCode;

    // 효과성 검증 계획
    @Builder.Default
    private Boolean effectivenessRequired = true;
    private LocalDate effectivenessDueDate;
}
