package com.example.ims.dto;

import com.example.ims.entity.CsvProjectStatus;
import com.example.ims.entity.GampCategory;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CsvProjectResponse {
    private Long id;
    private String projectCode;
    private String projectName;
    private String systemVersion;
    private GampCategory gampCategory;
    private String gampCategoryDescription;
    private String systemDescription;
    private String validationLead;
    private String qaManager;
    private String executiveSponsor;
    private LocalDate plannedStartDate;
    private LocalDate plannedEndDate;
    private LocalDate actualCompletionDate;
    private CsvProjectStatus projectStatus;
    private String projectStatusDescription;
    private String overallConclusion;
    private long totalProtocols;
    private long passedProtocols;
    private long openDefects;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
