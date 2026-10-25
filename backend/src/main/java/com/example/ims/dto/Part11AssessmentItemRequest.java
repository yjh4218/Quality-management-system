package com.example.ims.dto;

import com.example.ims.entity.Part11ComplianceStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Part11AssessmentItemRequest {

    @NotBlank(message = "규제 조항 코드는 필수입니다.")
    private String sectionCode;

    @NotBlank(message = "요건 명칭은 필수입니다.")
    private String requirementTitle;

    private String regulatoryStandard;
    private String requirementDetails;

    @NotNull(message = "적합성 판정은 필수입니다.")
    private Part11ComplianceStatus complianceStatus;

    private String implementationSummary;
    private String evidenceDocument;
    private String assessedBy;
    private LocalDate assessedDate;
    private String verifiedBy;
    private Integer displayOrder;
}
