package com.example.ims.dto;

import com.example.ims.entity.DesignPhase;
import com.example.ims.entity.DesignProjectStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DesignProjectRequest {

    private String projectCode;

    @NotBlank(message = "프로젝트 명칭은 필수입니다.")
    private String projectName;

    private Long medicalDeviceId;

    @NotBlank(message = "대상 의료기기 명칭은 필수입니다.")
    private String targetDeviceName;

    private String deviceClassification;

    @NotBlank(message = "책임자는 필수입니다.")
    private String projectLeader;

    @NotBlank(message = "담당 부서는 필수입니다.")
    private String department;

    @NotNull(message = "시작일은 필수입니다.")
    private LocalDate startDate;

    @NotNull(message = "목표 완료일은 필수입니다.")
    private LocalDate targetCompletionDate;

    private LocalDate actualCompletionDate;

    private DesignPhase currentPhase;

    private DesignProjectStatus status;

    private String dhfNumber;

    private String dhfStatus;

    private Long riskAssessmentId;

    private String description;
}
