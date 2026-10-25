package com.example.ims.dto;

import com.example.ims.entity.IntegrationStatus;
import com.example.ims.entity.IntegrationSystemType;
import com.example.ims.entity.InterfaceType;
import com.example.ims.entity.TransferProtocol;
import jakarta.validation.constraints.NotNull;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ExternalIntegrationRequest {

    @NotNull(message = "시스템 유형은 필수입니다.")
    private IntegrationSystemType systemType;

    @NotNull(message = "인터페이스 유형은 필수입니다.")
    private InterfaceType interfaceType;

    @NotNull(message = "전송 방식은 필수입니다.")
    private TransferProtocol transferProtocol;

    private String targetBatchNumber;

    private String requestPayload;

    private Integer recordCount;

    private Integer discrepancyCount;

    private String reconciliationNotes;
}
