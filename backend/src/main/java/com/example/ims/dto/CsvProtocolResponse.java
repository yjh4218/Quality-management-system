package com.example.ims.dto;

import com.example.ims.entity.TestResultStatus;
import com.example.ims.entity.ValidationTestPhase;
import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CsvProtocolResponse {
    private Long id;
    private Long projectId;
    private String projectCode;
    private String protocolNumber;
    private ValidationTestPhase testPhase;
    private String testPhaseDescription;
    private String testTitle;
    private String requirementMapping;
    private String preconditions;
    private String executionSteps;
    private String expectedResult;
    private String actualResult;
    private TestResultStatus resultStatus;
    private String resultStatusDescription;
    private String executedBy;
    private LocalDateTime executedAt;
    private String verifiedBy;
    private LocalDateTime verifiedAt;
    private String deviationNotes;
    private Integer displayOrder;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
