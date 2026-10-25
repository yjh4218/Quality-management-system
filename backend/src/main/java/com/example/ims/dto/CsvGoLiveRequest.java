package com.example.ims.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CsvGoLiveRequest {
    @NotNull(message = "소속 CSV 프로젝트 ID는 필수입니다.")
    private Long projectId;

    @NotBlank(message = "릴리즈 버전은 필수입니다.")
    private String releaseVersion;

    @NotBlank(message = "승인 헌장 명칭은 필수입니다.")
    private String approvalTitle;

    @NotBlank(message = "시스템 관리자 성명은 필수입니다.")
    private String systemOwnerName;
    private LocalDateTime systemOwnerSignedAt;
    private String systemOwnerSignatureNumber;

    @NotBlank(message = "품질관리 책임자 성명은 필수입니다.")
    private String qaLeadName;
    private LocalDateTime qaLeadSignedAt;
    private String qaLeadSignatureNumber;

    @NotBlank(message = "최고경영자/승인권자 성명은 필수입니다.")
    private String executiveName;
    private LocalDateTime executiveSignedAt;
    private String executiveSignatureNumber;

    private String finalApprovalStatus;
    private LocalDate goLiveDate;
    private String contingencyPlan;
    private String authorizedNotes;
}
