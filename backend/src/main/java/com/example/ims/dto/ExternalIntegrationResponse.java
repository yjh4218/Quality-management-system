package com.example.ims.dto;

import com.example.ims.entity.ExternalIntegrationLog;
import com.example.ims.entity.IntegrationStatus;
import com.example.ims.entity.IntegrationSystemType;
import com.example.ims.entity.InterfaceType;
import com.example.ims.entity.TransferProtocol;
import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ExternalIntegrationResponse {

    private Long id;
    private String logNumber;
    private IntegrationSystemType systemType;
    private String systemTypeDesc;
    private InterfaceType interfaceType;
    private String interfaceTypeDesc;
    private TransferProtocol transferProtocol;
    private String transferProtocolDesc;
    private IntegrationStatus status;
    private String statusDesc;
    private String statusColor;
    private String targetBatchNumber;
    private String targetItemName;
    private String requestPayload;
    private String responsePayload;
    private Integer recordCount;
    private Integer discrepancyCount;
    private String reconciledBy;
    private String reconciliationNotes;
    private LocalDateTime reconciledAt;
    private String createdBy;
    private LocalDateTime createdAt;

    public static ExternalIntegrationResponse fromEntity(ExternalIntegrationLog entity) {
        if (entity == null) return null;
        return ExternalIntegrationResponse.builder()
                .id(entity.getId())
                .logNumber(entity.getLogNumber())
                .systemType(entity.getSystemType())
                .systemTypeDesc(entity.getSystemType() != null ? entity.getSystemType().getDescription() : "")
                .interfaceType(entity.getInterfaceType())
                .interfaceTypeDesc(entity.getInterfaceType() != null ? entity.getInterfaceType().getDescription() : "")
                .transferProtocol(entity.getTransferProtocol())
                .transferProtocolDesc(entity.getTransferProtocol() != null ? entity.getTransferProtocol().getDescription() : "")
                .status(entity.getStatus())
                .statusDesc(entity.getStatus() != null ? entity.getStatus().getDescription() : "")
                .statusColor(entity.getStatus() != null ? entity.getStatus().getColor() : "#94a3b8")
                .targetBatchNumber(entity.getTargetBatchNumber())
                .requestPayload(entity.getRequestPayload())
                .responsePayload(entity.getResponsePayload())
                .recordCount(entity.getRecordCount())
                .discrepancyCount(entity.getDiscrepancyCount())
                .reconciledBy(entity.getReconciledBy())
                .reconciliationNotes(entity.getReconciliationNotes())
                .reconciledAt(entity.getReconciledAt())
                .createdBy(entity.getCreatedBy())
                .createdAt(entity.getCreatedAt())
                .build();
    }
}
