package com.example.ims.dto;

import com.example.ims.entity.AuthorityType;
import com.example.ims.entity.IncidentSeverity;
import com.example.ims.entity.ProductRegulatoryType;
import com.example.ims.entity.VigilanceReportClassification;
import com.example.ims.entity.VigilanceSourceType;
import com.example.ims.entity.VigilanceSubmissionStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class VigilanceReportRequest {

    @NotBlank(message = "보고서 제목은 필수입니다.")
    private String title;

    @NotNull(message = "규제기관은 필수입니다.")
    private AuthorityType authorityType;

    @NotNull(message = "규제 제품 유형은 필수입니다.")
    private ProductRegulatoryType regulatoryType;

    @NotNull(message = "보고 분류는 필수입니다.")
    private VigilanceReportClassification reportClassification;

    @NotNull(message = "사건 심각도는 필수입니다.")
    private IncidentSeverity incidentSeverity;

    @NotNull(message = "발생 소스는 필수입니다.")
    private VigilanceSourceType sourceType;

    private Long sourceId;
    private String sourceNumber;
    private String sourceDescription;

    private String itemCode;
    private String productName;
    private String lotNumber;
    private Boolean isLotUnknown;

    @NotNull(message = "사례 인지일자는 필수입니다.")
    private LocalDate awarenessDate;

    // dueDate가 null인 경우 분류에 따라 자동 계산됨
    private LocalDate dueDate;

    private LocalDate submissionDate;
    private VigilanceSubmissionStatus submissionStatus;
    private String authoritySubmissionNumber;

    @NotBlank(message = "이상사례 설명은 필수입니다.")
    private String incidentDescription;

    private String patientImpact;
    private String preliminaryCausality;
    private String reporterName;
    private String reportedToDepartment;
    private String actionTaken;

    private Boolean capaRequired;
    private Long capaId;
    private String capaNumber;
}
