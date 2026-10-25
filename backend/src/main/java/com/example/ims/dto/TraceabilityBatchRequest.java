package com.example.ims.dto;

import com.example.ims.entity.BatchStage;
import com.example.ims.entity.ItemCategory;
import com.example.ims.entity.TraceabilityQualityStatus;
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
public class TraceabilityBatchRequest {

    private String batchNumber; // 자동 채번 또는 수기 입력

    @NotNull(message = "공정 단계는 필수입니다.")
    private BatchStage batchStage;

    @NotBlank(message = "품목코드는 필수입니다.")
    private String itemCode;

    @NotBlank(message = "품목명은 필수입니다.")
    private String itemName;

    @NotNull(message = "품목 분류는 필수입니다.")
    private ItemCategory itemCategory;

    private String specification;

    @NotNull(message = "수량은 필수입니다.")
    private BigDecimal quantity;

    private BigDecimal remainingQuantity;

    private String unit;

    private LocalDate manufacturingDate;

    private LocalDate expirationDate;

    private String supplierOrManufacturer;

    private String manufacturingLine;

    private String storageLocation;

    private TraceabilityQualityStatus qualityStatus;

    private String coaNumber;

    private String coaFileUrl;

    private String notes;
}
