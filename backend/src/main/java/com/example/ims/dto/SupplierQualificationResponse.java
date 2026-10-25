package com.example.ims.dto;

import com.example.ims.entity.SupplierApprovalStatus;
import com.example.ims.entity.SupplierGrade;
import com.example.ims.entity.SupplierQualification;
import com.example.ims.entity.SupplierType;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * 🏭 공급업체 적격성 승인 응답 DTO
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SupplierQualificationResponse {

    private Long id;
    private String supplierCode;
    private Long manufacturerId;
    private String manufacturerName;
    private String manufacturerCategory;
    private SupplierType supplierType;
    private String supplierTypeDesc;
    private SupplierApprovalStatus approvalStatus;
    private String approvalStatusDesc;
    private SupplierGrade supplierGrade;
    private String supplierGradeDesc;
    private String riskLevel;
    private String isoCertifications;
    private String businessRegistrationNumber;
    private LocalDate initialApprovalDate;
    private LocalDate lastAuditDate;
    private LocalDate nextEvaluationDate;
    private String scopeOfSupply;
    private String qualificationNotes;
    private String approvedBy;
    private String createdBy;
    private String updatedBy;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static SupplierQualificationResponse fromEntity(SupplierQualification entity) {
        if (entity == null) return null;
        return SupplierQualificationResponse.builder()
                .id(entity.getId())
                .supplierCode(entity.getSupplierCode())
                .manufacturerId(entity.getManufacturer() != null ? entity.getManufacturer().getId() : null)
                .manufacturerName(entity.getManufacturer() != null ? entity.getManufacturer().getName() : null)
                .manufacturerCategory(entity.getManufacturer() != null ? entity.getManufacturer().getCategory() : null)
                .supplierType(entity.getSupplierType())
                .supplierTypeDesc(entity.getSupplierType() != null ? entity.getSupplierType().getDescription() : null)
                .approvalStatus(entity.getApprovalStatus())
                .approvalStatusDesc(entity.getApprovalStatus() != null ? entity.getApprovalStatus().getDescription() : null)
                .supplierGrade(entity.getSupplierGrade())
                .supplierGradeDesc(entity.getSupplierGrade() != null ? entity.getSupplierGrade().getDescription() : null)
                .riskLevel(entity.getRiskLevel())
                .isoCertifications(entity.getIsoCertifications())
                .businessRegistrationNumber(entity.getBusinessRegistrationNumber())
                .initialApprovalDate(entity.getInitialApprovalDate())
                .lastAuditDate(entity.getLastAuditDate())
                .nextEvaluationDate(entity.getNextEvaluationDate())
                .scopeOfSupply(entity.getScopeOfSupply())
                .qualificationNotes(entity.getQualificationNotes())
                .approvedBy(entity.getApprovedBy())
                .createdBy(entity.getCreatedBy())
                .updatedBy(entity.getUpdatedBy())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }
}
