package com.example.ims.dto;

import com.example.ims.entity.ChecklistResult;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AuditChecklistRequest {

    @NotNull(message = "대상 심사 ID는 필수입니다.")
    private Long internalAuditId;

    @NotBlank(message = "규격 조항 번호는 필수입니다.")
    private String clauseNumber;

    @NotBlank(message = "점검 항목(체크포인트)은 필수입니다.")
    private String checkpoint;

    private String auditMethod;
    private String evidenceNotes;

    @NotNull(message = "판정 결과는 필수입니다.")
    private ChecklistResult result;

    private String auditedBy;
    private LocalDate auditedDate;
    private String remarks;
}
