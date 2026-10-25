package com.example.ims.dto;

import com.example.ims.entity.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ComplaintSafetyResponse {

    private Long id;
    private Long version;
    private String evaluationNumber;
    private Long claimId;
    private String claimNumber;
    private String title;
    private ProductRegulatoryType productType;
    private String productTypeDescription;
    private String itemCode;
    private String productName;
    private String lotNumber;
    private Boolean isLotUnknown;
    private String manufacturer;
    private LocalDate receiptDate;
    private String evaluatorName;
    private LocalDate evaluationDate;

    // 고객/환자 정보
    private String customerName;
    private String customerContact;
    private Integer patientAge;
    private String patientGender;

    // 이상사례 증상
    private AdverseEventCategory adverseEventCategory;
    private String adverseEventCategoryDescription;
    private String symptomDescription;
    private Integer onsetDays;
    private Boolean medicalTreatmentGiven;
    private String treatmentDetails;

    // 중대성 판정
    private Boolean isSerious;
    private String seriousReason;

    // 인과관계 평가
    private CausalityGrade causalityGrade;
    private String causalityGradeLabel;
    private String causalityRationale;

    // 규제기관 보고
    private ReportabilityStatus reportabilityStatus;
    private String reportabilityStatusLabel;
    private LocalDate reportDeadline;
    private LocalDate authorityReportDate;
    private String authorityReportNumber;
    private String authorityFeedback;

    // 원인조사
    private Boolean investigationRequired;
    private String noInvestigationReason;
    private String investigationSummary;

    // CAPA
    private Boolean capaRequired;
    private CapaLinkageStatus capaStatus;
    private String capaNumber;
    private String capaRationale;

    // 상태 및 종결
    private ComplaintEvaluationStatus evaluationStatus;
    private String evaluationStatusLabel;
    private String closedBy;
    private LocalDateTime closedAt;
    private String closureRemarks;

    // 액션 아이템 목록
    private List<ComplaintActionItemResponse> actionItems;
    private Integer actionItemCount;

    // 감사추적
    private String createdBy;
    private String updatedBy;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static ComplaintSafetyResponse from(ComplaintSafetyEvaluation e) {
        if (e == null) return null;
        List<ComplaintActionItemResponse> items = e.getActionItems() == null ? Collections.emptyList() :
                e.getActionItems().stream().map(ComplaintActionItemResponse::from).collect(Collectors.toList());

        return ComplaintSafetyResponse.builder()
                .id(e.getId())
                .version(e.getVersion())
                .evaluationNumber(e.getEvaluationNumber())
                .claimId(e.getClaimId())
                .claimNumber(e.getClaimNumber())
                .title(e.getTitle())
                .productType(e.getProductType())
                .productTypeDescription(e.getProductType() != null ? e.getProductType().getDescription() : "")
                .itemCode(e.getItemCode())
                .productName(e.getProductName())
                .lotNumber(e.getLotNumber())
                .isLotUnknown(e.getIsLotUnknown())
                .manufacturer(e.getManufacturer())
                .receiptDate(e.getReceiptDate())
                .evaluatorName(e.getEvaluatorName())
                .evaluationDate(e.getEvaluationDate())
                .customerName(e.getCustomerName())
                .customerContact(e.getCustomerContact())
                .patientAge(e.getPatientAge())
                .patientGender(e.getPatientGender())
                .adverseEventCategory(e.getAdverseEventCategory())
                .adverseEventCategoryDescription(e.getAdverseEventCategory() != null ? e.getAdverseEventCategory().getDescription() : "")
                .symptomDescription(e.getSymptomDescription())
                .onsetDays(e.getOnsetDays())
                .medicalTreatmentGiven(e.getMedicalTreatmentGiven())
                .treatmentDetails(e.getTreatmentDetails())
                .isSerious(e.getIsSerious())
                .seriousReason(e.getSeriousReason())
                .causalityGrade(e.getCausalityGrade())
                .causalityGradeLabel(e.getCausalityGrade() != null ? e.getCausalityGrade().getLabel() : "")
                .causalityRationale(e.getCausalityRationale())
                .reportabilityStatus(e.getReportabilityStatus())
                .reportabilityStatusLabel(e.getReportabilityStatus() != null ? e.getReportabilityStatus().getLabel() : "")
                .reportDeadline(e.getReportDeadline())
                .authorityReportDate(e.getAuthorityReportDate())
                .authorityReportNumber(e.getAuthorityReportNumber())
                .authorityFeedback(e.getAuthorityFeedback())
                .investigationRequired(e.getInvestigationRequired())
                .noInvestigationReason(e.getNoInvestigationReason())
                .investigationSummary(e.getInvestigationSummary())
                .capaRequired(e.getCapaRequired())
                .capaStatus(e.getCapaStatus())
                .capaNumber(e.getCapaNumber())
                .capaRationale(e.getCapaRationale())
                .evaluationStatus(e.getEvaluationStatus())
                .evaluationStatusLabel(e.getEvaluationStatus() != null ? e.getEvaluationStatus().getLabel() : "")
                .closedBy(e.getClosedBy())
                .closedAt(e.getClosedAt())
                .closureRemarks(e.getClosureRemarks())
                .actionItems(items)
                .actionItemCount(items.size())
                .createdBy(e.getCreatedBy())
                .updatedBy(e.getUpdatedBy())
                .createdAt(e.getCreatedAt())
                .updatedAt(e.getUpdatedAt())
                .build();
    }
}
