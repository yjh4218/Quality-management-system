package com.example.ims.dto;

import com.example.ims.entity.BarcodeRecord;
import com.example.ims.entity.BarcodeStatus;
import com.example.ims.entity.BarcodeType;
import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BarcodeRecordResponse {

    private Long id;
    private String barcodeValue;
    private BarcodeType barcodeType;
    private String barcodeTypeDesc;
    private String batchNumber;
    private String itemName;
    private String gtin;
    private String expirationDateString;
    private String serialNumber;
    private Integer printCount;
    private BarcodeStatus status;
    private String statusDesc;
    private String statusColor;
    private String issuedBy;
    private LocalDateTime createdAt;

    public static BarcodeRecordResponse fromEntity(BarcodeRecord entity) {
        if (entity == null) return null;
        return BarcodeRecordResponse.builder()
                .id(entity.getId())
                .barcodeValue(entity.getBarcodeValue())
                .barcodeType(entity.getBarcodeType())
                .barcodeTypeDesc(entity.getBarcodeType() != null ? entity.getBarcodeType().getDescription() : "")
                .batchNumber(entity.getBatchNumber())
                .gtin(entity.getGtin())
                .expirationDateString(entity.getExpirationDateString())
                .serialNumber(entity.getSerialNumber())
                .printCount(entity.getPrintCount())
                .status(entity.getStatus())
                .statusDesc(entity.getStatus() != null ? entity.getStatus().getDescription() : "")
                .statusColor(entity.getStatus() != null ? entity.getStatus().getColor() : "#94a3b8")
                .issuedBy(entity.getIssuedBy())
                .createdAt(entity.getCreatedAt())
                .build();
    }
}
