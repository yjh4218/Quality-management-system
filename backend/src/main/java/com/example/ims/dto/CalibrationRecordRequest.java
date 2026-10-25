package com.example.ims.dto;

import com.example.ims.entity.CalibrationAgencyType;
import com.example.ims.entity.CalibrationResult;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CalibrationRecordRequest {

    @NotNull(message = "대상 장비 ID는 필수입니다.")
    private Long equipmentId;

    @NotNull(message = "교정 일자는 필수입니다.")
    private LocalDate calibrationDate;

    @NotNull(message = "교정 기관 분류는 필수입니다.")
    private CalibrationAgencyType agencyType;

    private String agencyName;
    private String certificateNumber;
    private String certificateFileUrl;

    @NotNull(message = "교정 판정 결과는 필수입니다.")
    private CalibrationResult result;

    private String toleranceStandard;
    private String maxDeviation;
    private String calibratedBy;
    private String verifiedBy;
    private LocalDate verificationDate;

    private Boolean impactAssessmentRequired;
    private String impactAssessmentNotes;

    // Optional override; if null, will be auto-calculated using equipment's calibrationCycleMonths
    private LocalDate nextCalibrationDueDate;

    private String remarks;
}
