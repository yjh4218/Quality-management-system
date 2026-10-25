package com.example.ims.dto;

import com.example.ims.entity.DesignPhase;
import com.example.ims.entity.DesignProjectStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DesignProjectResponse {

    private Long id;
    private Long version;
    private String projectCode;
    private String projectName;
    private Long medicalDeviceId;
    private String targetDeviceName;
    private String deviceClassification;
    private String projectLeader;
    private String department;
    private LocalDate startDate;
    private LocalDate targetCompletionDate;
    private LocalDate actualCompletionDate;
    private DesignPhase currentPhase;
    private String currentPhaseLabel;
    private DesignProjectStatus status;
    private String statusLabel;
    private String dhfNumber;
    private String dhfStatus;
    private Long riskAssessmentId;
    private String description;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private String createdBy;
    private String updatedBy;

    // 통계 지표
    private long totalControlItemCount;
    private long inputCount;
    private long outputCount;
    private long verificationCount;
    private long validationCount;
    private long transferCount;
    private long passCount;
    private long failCount;
    private long pendingCount;
    private long reviewCount;
    private double verificationPassRate;
    private double traceabilityRate;
}
