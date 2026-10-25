package com.example.ims.dto;

import com.example.ims.entity.FindingClassification;
import com.example.ims.entity.FindingStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AuditFindingRequest {

    @NotNull(message = "대상 심사 ID는 필수입니다.")
    private Long internalAuditId;

    private Long auditChecklistId;

    @NotBlank(message = "규격 조항은 필수입니다.")
    private String clauseNumber;

    @NotNull(message = "지적사항 분류는 필수입니다.")
    private FindingClassification classification;

    private FindingStatus status;

    @NotBlank(message = "지적 상세 내용은 필수입니다.")
    private String findingDetails;

    private String requirementCriteria;
    private String auditeeActionPlan;
    private LocalDate actionDueDate;
    private LocalDate actionCompletedDate;
    private String capaNumber;
    private String verifiedBy;
    private LocalDate verifiedDate;
    private String verificationNotes;
}
