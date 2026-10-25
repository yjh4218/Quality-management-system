package com.example.ims.dto;

import com.example.ims.entity.TestResultStatus;
import com.example.ims.entity.ValidationTestPhase;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CsvProtocolRequest {
    @NotNull(message = "소속 CSV 프로젝트 ID는 필수입니다.")
    private Long projectId;

    @NotBlank(message = "프로토콜 번호는 필수입니다.")
    private String protocolNumber;

    @NotNull(message = "적격성평가 단계(IQ/OQ/PQ)는 필수입니다.")
    private ValidationTestPhase testPhase;

    @NotBlank(message = "시험 항목 제목은 필수입니다.")
    private String testTitle;

    private String requirementMapping;
    private String preconditions;
    private String executionSteps;
    private String expectedResult;
    private String actualResult;
    private TestResultStatus resultStatus;
    private String executedBy;
    private LocalDateTime executedAt;
    private String verifiedBy;
    private LocalDateTime verifiedAt;
    private String deviationNotes;
    private Integer displayOrder;
}
