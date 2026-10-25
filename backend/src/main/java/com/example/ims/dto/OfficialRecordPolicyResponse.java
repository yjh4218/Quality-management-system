package com.example.ims.dto;

import com.example.ims.entity.OfficialOriginalType;
import com.example.ims.entity.RecordCategory;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OfficialRecordPolicyResponse {

    private Long id;
    private String policyCode;
    private String policyTitle;
    private RecordCategory recordCategory;
    private String recordCategoryDescription;
    private OfficialOriginalType officialOriginalType;
    private String officialOriginalTypeDescription;
    private String storageFormat;
    private Integer retentionPeriodYears;
    private String retentionPeriodCriteria;
    private String legalBasis;
    private String disposalProcedure;
    private Boolean isHybridSignedPaperRequired;
    private Boolean isActive;
    private LocalDate effectiveDate;
    private String approvedBy;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
