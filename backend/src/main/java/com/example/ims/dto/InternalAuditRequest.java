package com.example.ims.dto;

import com.example.ims.entity.AuditScope;
import com.example.ims.entity.AuditStatus;
import com.example.ims.entity.AuditType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class InternalAuditRequest {

    @NotBlank(message = "심사 제목은 필수입니다.")
    private String title;

    @NotNull(message = "심사 유형은 필수입니다.")
    private AuditType auditType;

    @NotNull(message = "심사 범위는 필수입니다.")
    private AuditScope auditScope;

    private String criteria;

    @NotNull(message = "심사 계획 시작일은 필수입니다.")
    private LocalDate plannedStartDate;

    @NotNull(message = "심사 계획 종료일은 필수입니다.")
    private LocalDate plannedEndDate;

    private LocalDate actualStartDate;
    private LocalDate actualEndDate;

    @NotBlank(message = "피심사 부서는 필수입니다.")
    private String auditeeDepartment;

    @NotBlank(message = "피심사 부서 책임자는 필수입니다.")
    private String auditeeLeadName;

    @NotBlank(message = "선임 심사원은 필수입니다.")
    private String leadAuditorName;

    @NotBlank(message = "선임 심사원 소속 부서는 필수입니다.")
    private String leadAuditorDepartment;

    private String auditTeamMembers;

    private AuditStatus status;
    private String summaryConclusion;
    private String approvedBy;
    private LocalDate approvedDate;
}
