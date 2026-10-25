package com.example.ims.dto;

import com.example.ims.entity.OfficialOriginalType;
import com.example.ims.entity.RecordCategory;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OfficialRecordPolicyRequest {

    @NotBlank(message = "정책 코드는 필수입니다.")
    private String policyCode;

    @NotBlank(message = "정책 명칭은 필수입니다.")
    private String policyTitle;

    @NotNull(message = "기록 카테고리는 필수입니다.")
    private RecordCategory recordCategory;

    @NotNull(message = "공식 원본 유형은 필수입니다.")
    private OfficialOriginalType officialOriginalType;

    private String storageFormat;

    @NotNull(message = "보존 연한은 필수입니다.")
    private Integer retentionPeriodYears;

    private String retentionPeriodCriteria;
    private String legalBasis;
    private String disposalProcedure;
    private Boolean isHybridSignedPaperRequired;
    private Boolean isActive;
    private LocalDate effectiveDate;
    private String approvedBy;
}
