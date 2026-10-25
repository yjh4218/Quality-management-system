package com.example.ims.dto;

import com.example.ims.entity.CsvProjectStatus;
import com.example.ims.entity.GampCategory;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CsvProjectRequest {
    @NotBlank(message = "프로젝트 코드는 필수입니다.")
    private String projectCode;

    @NotBlank(message = "프로젝트 명칭은 필수입니다.")
    private String projectName;

    @NotBlank(message = "대상 시스템 버전은 필수입니다.")
    private String systemVersion;

    @NotNull(message = "GAMP 5 카테고리는 필수입니다.")
    private GampCategory gampCategory;

    private String systemDescription;

    @NotBlank(message = "밸리데이션 책임자(Lead)는 필수입니다.")
    private String validationLead;

    @NotBlank(message = "품질관리 책임자는 필수입니다.")
    private String qaManager;

    private String executiveSponsor;
    private LocalDate plannedStartDate;
    private LocalDate plannedEndDate;
    private LocalDate actualCompletionDate;
    private CsvProjectStatus projectStatus;
    private String overallConclusion;
}
