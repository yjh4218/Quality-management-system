package com.example.ims.dto;

import com.example.ims.entity.AgreementStatus;
import com.example.ims.entity.AgreementType;
import com.example.ims.entity.QualityAgreement;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * 🏭 품질협약서(QAA) 응답 DTO
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class QualityAgreementResponse {

    private Long id;
    private String agreementNumber;
    private Long manufacturerId;
    private String manufacturerName;
    private Long qualificationId;
    private String supplierCode;
    private String title;
    private AgreementType agreementType;
    private String agreementTypeDesc;
    private LocalDate effectiveDate;
    private LocalDate expiryDate;
    private LocalDate retentionExpiryDate;
    private Boolean autoRenewal;
    private Integer renewalNoticeDays;
    private AgreementStatus agreementStatus;
    private String agreementStatusDesc;
    private String changeNotificationObligation;
    private Boolean auditRightsConfirmed;
    private String agreementDocUrl;
    private String documentFileName;
    private String notes;
    private String createdBy;
    private String updatedBy;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static QualityAgreementResponse fromEntity(QualityAgreement entity) {
        if (entity == null) return null;
        return QualityAgreementResponse.builder()
                .id(entity.getId())
                .agreementNumber(entity.getAgreementNumber())
                .manufacturerId(entity.getManufacturer() != null ? entity.getManufacturer().getId() : null)
                .manufacturerName(entity.getManufacturer() != null ? entity.getManufacturer().getName() : null)
                .qualificationId(entity.getQualification() != null ? entity.getQualification().getId() : null)
                .supplierCode(entity.getQualification() != null ? entity.getQualification().getSupplierCode() : null)
                .title(entity.getTitle())
                .agreementType(entity.getAgreementType())
                .agreementTypeDesc(entity.getAgreementType() != null ? entity.getAgreementType().getDescription() : null)
                .effectiveDate(entity.getEffectiveDate())
                .expiryDate(entity.getExpiryDate())
                .retentionExpiryDate(entity.getRetentionExpiryDate())
                .autoRenewal(entity.getAutoRenewal())
                .renewalNoticeDays(entity.getRenewalNoticeDays())
                .agreementStatus(entity.getAgreementStatus())
                .agreementStatusDesc(entity.getAgreementStatus() != null ? entity.getAgreementStatus().getDescription() : null)
                .changeNotificationObligation(entity.getChangeNotificationObligation())
                .auditRightsConfirmed(entity.getAuditRightsConfirmed())
                .agreementDocUrl(entity.getAgreementDocUrl())
                .documentFileName(entity.getDocumentFileName())
                .notes(entity.getNotes())
                .createdBy(entity.getCreatedBy())
                .updatedBy(entity.getUpdatedBy())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }
}
