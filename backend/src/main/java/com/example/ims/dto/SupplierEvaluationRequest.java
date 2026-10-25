package com.example.ims.dto;

import com.example.ims.entity.EvaluationPeriod;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.time.LocalDate;

/**
 * 🏭 공급업체 정기 종합평가 등록/수정 요청 DTO
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SupplierEvaluationRequest {

    @NotNull(message = "공급업체 자격 ID는 필수입니다.")
    private Long qualificationId;

    @NotNull(message = "평가 연도는 필수입니다.")
    private Integer evaluationYear;

    @Builder.Default
    private EvaluationPeriod evaluationPeriod = EvaluationPeriod.ANNUAL;

    @NotNull(message = "품질 점수는 필수입니다.")
    @Min(value = 0, message = "품질 점수는 0점 이상이어야 합니다.")
    @Max(value = 40, message = "품질 점수는 40점 이하여야 합니다.")
    private Integer qualityScore;

    @NotNull(message = "납기 점수는 필수입니다.")
    @Min(value = 0, message = "납기 점수는 0점 이상이어야 합니다.")
    @Max(value = 25, message = "납기 점수는 25점 이하여야 합니다.")
    private Integer deliveryScore;

    @NotNull(message = "규제/서류 적합성 점수는 필수입니다.")
    @Min(value = 0, message = "규제/서류 적합성 점수는 0점 이상이어야 합니다.")
    @Max(value = 20, message = "규제/서류 적합성 점수는 20점 이하여야 합니다.")
    private Integer complianceScore;

    @NotNull(message = "서비스/협력 점수는 필수입니다.")
    @Min(value = 0, message = "서비스/협력 점수는 0점 이상이어야 합니다.")
    @Max(value = 15, message = "서비스/협력 점수는 15점 이하여야 합니다.")
    private Integer serviceScore;

    @NotNull(message = "평가 일자는 필수입니다.")
    private LocalDate evaluationDate;

    @NotBlank(message = "평가자 성명은 필수입니다.")
    private String evaluatorName;

    private String evaluatorDepartment;
    private String evaluationSummary;

    @Builder.Default
    private Boolean correctiveActionRequired = false;

    private String actionDetails;
    private Long capaId;
}
