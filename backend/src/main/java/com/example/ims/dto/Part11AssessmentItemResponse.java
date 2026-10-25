package com.example.ims.dto;

import com.example.ims.entity.Part11ComplianceStatus;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Part11AssessmentItemResponse {

    private Long id;
    private String sectionCode;
    private String requirementTitle;
    private String regulatoryStandard;
    private String requirementDetails;
    private Part11ComplianceStatus complianceStatus;
    private String complianceStatusDescription;
    private String implementationSummary;
    private String evidenceDocument;
    private String assessedBy;
    private LocalDate assessedDate;
    private String verifiedBy;
    private Integer displayOrder;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
