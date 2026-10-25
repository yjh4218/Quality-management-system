package com.example.ims.dto;

import com.example.ims.entity.CalibrationAgencyType;
import com.example.ims.entity.CalibrationRecord;
import com.example.ims.entity.CalibrationResult;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CalibrationRecordResponse {

    private Long id;
    private String calibrationNumber;
    private Long equipmentId;
    private String equipmentCode;
    private String equipmentName;
    private String installationLocation;
    private LocalDate calibrationDate;
    private CalibrationAgencyType agencyType;
    private String agencyTypeDescription;
    private String agencyName;
    private String certificateNumber;
    private String certificateFileUrl;
    private CalibrationResult result;
    private String resultDescription;
    private String toleranceStandard;
    private String maxDeviation;
    private String calibratedBy;
    private String verifiedBy;
    private LocalDate verificationDate;
    private Boolean impactAssessmentRequired;
    private String impactAssessmentNotes;
    private LocalDate nextCalibrationDueDate;
    private String remarks;
    private Boolean isDeleted;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private String createdBy;
    private String lastModifiedBy;

    public static CalibrationRecordResponse fromEntity(CalibrationRecord c) {
        if (c == null) return null;

        return CalibrationRecordResponse.builder()
                .id(c.getId())
                .calibrationNumber(c.getCalibrationNumber())
                .equipmentId(c.getEquipment() != null ? c.getEquipment().getId() : null)
                .equipmentCode(c.getEquipment() != null ? c.getEquipment().getEquipmentCode() : null)
                .equipmentName(c.getEquipment() != null ? c.getEquipment().getEquipmentName() : null)
                .installationLocation(c.getEquipment() != null ? c.getEquipment().getInstallationLocation() : null)
                .calibrationDate(c.getCalibrationDate())
                .agencyType(c.getAgencyType())
                .agencyTypeDescription(c.getAgencyType() != null ? c.getAgencyType().getDescription() : null)
                .agencyName(c.getAgencyName())
                .certificateNumber(c.getCertificateNumber())
                .certificateFileUrl(c.getCertificateFileUrl())
                .result(c.getResult())
                .resultDescription(c.getResult() != null ? c.getResult().getDescription() : null)
                .toleranceStandard(c.getToleranceStandard())
                .maxDeviation(c.getMaxDeviation())
                .calibratedBy(c.getCalibratedBy())
                .verifiedBy(c.getVerifiedBy())
                .verificationDate(c.getVerificationDate())
                .impactAssessmentRequired(c.getImpactAssessmentRequired())
                .impactAssessmentNotes(c.getImpactAssessmentNotes())
                .nextCalibrationDueDate(c.getNextCalibrationDueDate())
                .remarks(c.getRemarks())
                .isDeleted(c.getIsDeleted())
                .createdAt(c.getCreatedAt())
                .updatedAt(c.getUpdatedAt())
                .createdBy(c.getCreatedBy())
                .lastModifiedBy(c.getLastModifiedBy())
                .build();
    }
}
