package com.example.ims.dto;

import com.example.ims.entity.NcrOccurrenceStage;
import com.example.ims.entity.NcrSeverity;
import com.example.ims.entity.NcrStatus;
import com.example.ims.entity.QuarantineStatus;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class NcrUpdateRequest {

    private String title;
    private NcrOccurrenceStage stage;
    private NcrSeverity severity;
    private NcrStatus status;
    private String itemCode;
    private String productName;
    private String lotNumber;
    private BigDecimal affectedQuantity;
    private String unit;
    private String supplierName;
    private LocalDate occurredDate;
    private String discoveredBy;
    private String defectType;
    private String defectDescription;
    private String immediateAction;
    private QuarantineStatus quarantineStatus;
    private String quarantineLocation;
    private String rootCauseAnalysis;
    private Boolean capaRequired;
    private String capaRationale;
}
