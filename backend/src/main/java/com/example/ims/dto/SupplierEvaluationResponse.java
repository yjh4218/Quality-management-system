package com.example.ims.dto;

import com.example.ims.entity.EvaluationPeriod;
import com.example.ims.entity.SupplierEvaluation;
import com.example.ims.entity.SupplierGrade;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * 🏭 공급업체 정기 종합평가 응답 DTO
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SupplierEvaluationResponse {

    private Long id;
    private Long qualificationId;
    private String supplierCode;
    private String manufacturerName;
    private Integer evaluationYear;
    private EvaluationPeriod evaluationPeriod;
    private String evaluationPeriodDesc;
    private Integer qualityScore;
    private Integer deliveryScore;
    private Integer complianceScore;
    private Integer serviceScore;
    private Integer totalScore;
    private SupplierGrade evaluationGrade;
    private String evaluationGradeDesc;
    private LocalDate evaluationDate;
    private String evaluatorName;
    private String evaluatorDepartment;
    private String evaluationSummary;
    private Boolean correctiveActionRequired;
    private String actionDetails;
    private Long capaId;
    private String createdBy;
    private String updatedBy;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static SupplierEvaluationResponse fromEntity(SupplierEvaluation entity) {
        if (entity == null) return null;
        String supplierCode = null;
        String mfrName = null;
        if (entity.getQualification() != null) {
            supplierCode = entity.getQualification().getSupplierCode();
            if (entity.getQualification().getManufacturer() != null) {
                mfrName = entity.getQualification().getManufacturer().getName();
            }
        }
        return SupplierEvaluationResponse.builder()
                .id(entity.getId())
                .qualificationId(entity.getQualification() != null ? entity.getQualification().getId() : null)
                .supplierCode(supplierCode)
                .manufacturerName(mfrName)
                .evaluationYear(entity.getEvaluationYear())
                .evaluationPeriod(entity.getEvaluationPeriod())
                .evaluationPeriodDesc(entity.getEvaluationPeriod() != null ? entity.getEvaluationPeriod().getDescription() : null)
                .qualityScore(entity.getQualityScore())
                .deliveryScore(entity.getDeliveryScore())
                .complianceScore(entity.getComplianceScore())
                .serviceScore(entity.getServiceScore())
                .totalScore(entity.getTotalScore())
                .evaluationGrade(entity.getEvaluationGrade())
                .evaluationGradeDesc(entity.getEvaluationGrade() != null ? entity.getEvaluationGrade().getDescription() : null)
                .evaluationDate(entity.getEvaluationDate())
                .evaluatorName(entity.getEvaluatorName())
                .evaluatorDepartment(entity.getEvaluatorDepartment())
                .evaluationSummary(entity.getEvaluationSummary())
                .correctiveActionRequired(entity.getCorrectiveActionRequired())
                .actionDetails(entity.getActionDetails())
                .capaId(entity.getCapaId())
                .createdBy(entity.getCreatedBy())
                .updatedBy(entity.getUpdatedBy())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }
}
