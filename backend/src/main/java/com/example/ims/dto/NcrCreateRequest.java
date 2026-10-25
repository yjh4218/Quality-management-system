package com.example.ims.dto;

import com.example.ims.entity.NcrOccurrenceStage;
import com.example.ims.entity.NcrSeverity;
import com.example.ims.entity.QuarantineStatus;
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
public class NcrCreateRequest {

    private String ncrNumber; // 생략 시 자동 채번 (NCR-yyyyMM-001)

    @NotBlank(message = "부적합 보고서 제목은 필수입니다.")
    private String title;

    @NotNull(message = "발생 단계는 필수입니다.")
    private NcrOccurrenceStage stage;

    @NotNull(message = "심각도 등급은 필수입니다.")
    private NcrSeverity severity;

    private String sourceType; // WMS_INBOUND, PRODUCTION_BATCH, etc.
    private Long sourceRecordId;

    @NotBlank(message = "품목코드는 필수입니다.")
    private String itemCode;

    @NotBlank(message = "품목명은 필수입니다.")
    private String productName;

    private String lotNumber;

    private BigDecimal affectedQuantity;

    private String unit;

    private String supplierName;

    @NotNull(message = "발생일자는 필수입니다.")
    private LocalDate occurredDate;

    private String discoveredBy;

    private String defectType;

    @NotBlank(message = "부적합 상세 설명은 필수입니다.")
    private String defectDescription;

    private String immediateAction;

    private QuarantineStatus quarantineStatus;

    private String quarantineLocation;

    private Boolean capaRequired;
    private String capaRationale;
}
