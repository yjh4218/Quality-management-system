package com.example.ims.dto;

import com.example.ims.entity.AdverseEventCategory;
import com.example.ims.entity.ProductRegulatoryType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ComplaintSafetyCreateRequest {

    private Long claimId;
    private String claimNumber;

    @NotBlank(message = "평가 보고서 제목은 필수입니다.")
    private String title;

    @NotNull(message = "제품 규제 유형은 필수입니다.")
    private ProductRegulatoryType productType;

    @NotBlank(message = "품목코드는 필수입니다.")
    private String itemCode;

    @NotBlank(message = "제품명은 필수입니다.")
    private String productName;

    // D-9 해소: lotNumber는 null 또는 빈값 허용, isLotUnknown 플래그 지원
    private String lotNumber;
    private Boolean isLotUnknown;

    private String manufacturer;

    @NotNull(message = "접수일자는 필수입니다.")
    private LocalDate receiptDate;

    @NotBlank(message = "평가자 성명은 필수입니다.")
    private String evaluatorName;

    @NotNull(message = "평가일자는 필수입니다.")
    private LocalDate evaluationDate;

    // 고객/환자 정보
    private String customerName;
    private String customerContact;
    private Integer patientAge;
    private String patientGender;

    // 이상사례 정보
    @NotNull(message = "이상사례 범주는 필수입니다.")
    private AdverseEventCategory adverseEventCategory;

    @NotBlank(message = "증상 설명은 필수입니다.")
    private String symptomDescription;

    private Integer onsetDays;
    private Boolean medicalTreatmentGiven;
    private String treatmentDetails;

    private Boolean isSerious;
    private String seriousReason;

    private Boolean investigationRequired;
    private String noInvestigationReason;
}
