package com.example.ims.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TraceabilityLinkRequest {

    @NotBlank(message = "부모(투입) LOT 번호는 필수입니다.")
    private String parentBatchNumber;

    @NotBlank(message = "자식(산출) LOT 번호는 필수입니다.")
    private String childBatchNumber;

    private String processStep;

    @NotNull(message = "투입 수량은 필수입니다.")
    private BigDecimal inputQuantity;

    private String inputUnit;

    private BigDecimal yieldRatio;

    @NotNull(message = "투입일자는 필수입니다.")
    private LocalDate linkDate;

    private String operatorName;

    private String notes;
}
