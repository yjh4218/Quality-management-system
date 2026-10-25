package com.example.ims.dto;

import com.example.ims.entity.DesignItemType;
import com.example.ims.entity.VerificationResultStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DesignControlItemRequest {

    private String itemCode;

    @NotNull(message = "통제 유형은 필수입니다.")
    private DesignItemType itemType;

    @NotBlank(message = "항목명은 필수입니다.")
    private String title;

    @NotBlank(message = "상세 사양은 필수입니다.")
    private String specification;

    private String acceptanceCriteria;

    private String verificationMethod;

    private VerificationResultStatus verificationResult;

    private String resultSummary;

    private String evidenceDocUrl;

    private String parentInputItemCode;

    private String riskHazardCode;

    @NotBlank(message = "담당자는 필수입니다.")
    private String responsiblePerson;

    private String status;
}
