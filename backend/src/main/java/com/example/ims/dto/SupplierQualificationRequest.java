package com.example.ims.dto;

import com.example.ims.entity.SupplierApprovalStatus;
import com.example.ims.entity.SupplierGrade;
import com.example.ims.entity.SupplierType;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.time.LocalDate;

/**
 * 🏭 공급업체 적격성 승인 등록/수정 요청 DTO
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SupplierQualificationRequest {

    private String supplierCode; // 비어있으면 자동채번 SUP-yyyyMM-xxx

    @NotNull(message = "제조사 ID는 필수입니다.")
    private Long manufacturerId;

    @NotNull(message = "공급업체 유형은 필수입니다.")
    private SupplierType supplierType;

    @Builder.Default
    private SupplierApprovalStatus approvalStatus = SupplierApprovalStatus.PENDING_QUALIFICATION;

    @Builder.Default
    private SupplierGrade supplierGrade = SupplierGrade.GRADE_B;

    @Builder.Default
    private String riskLevel = "MEDIUM";

    private String isoCertifications;
    private String businessRegistrationNumber;
    private LocalDate initialApprovalDate;
    private LocalDate lastAuditDate;
    private LocalDate nextEvaluationDate;
    private String scopeOfSupply;
    private String qualificationNotes;
    private String approvedBy;
}
