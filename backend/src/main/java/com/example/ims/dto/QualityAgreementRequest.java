package com.example.ims.dto;

import com.example.ims.entity.AgreementStatus;
import com.example.ims.entity.AgreementType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.time.LocalDate;

/**
 * 🏭 품질협약서(QAA) 등록/수정 요청 DTO
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class QualityAgreementRequest {

    private String agreementNumber; // 비어있으면 자동채번 QAA-yyyyMM-xxx

    @NotNull(message = "제조사 ID는 필수입니다.")
    private Long manufacturerId;

    private Long qualificationId;

    @NotBlank(message = "협약서 제목은 필수입니다.")
    private String title;

    @NotNull(message = "협약 유형은 필수입니다.")
    private AgreementType agreementType;

    @NotNull(message = "발효 일자는 필수입니다.")
    private LocalDate effectiveDate;

    @NotNull(message = "만료 일자는 필수입니다.")
    private LocalDate expiryDate;

    @NotNull(message = "법정 보존 만료일자는 필수입니다.")
    private LocalDate retentionExpiryDate;

    @Builder.Default
    private Boolean autoRenewal = false;

    @Builder.Default
    private Integer renewalNoticeDays = 60;

    @Builder.Default
    private AgreementStatus agreementStatus = AgreementStatus.ACTIVE;

    private String changeNotificationObligation;

    @Builder.Default
    private Boolean auditRightsConfirmed = true;

    private String agreementDocUrl;
    private String documentFileName;
    private String notes;
}
