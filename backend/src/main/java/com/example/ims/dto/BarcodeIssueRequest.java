package com.example.ims.dto;

import com.example.ims.entity.BarcodeType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BarcodeIssueRequest {

    @NotBlank(message = "연계 LOT 번호는 필수입니다.")
    private String batchNumber;

    @NotNull(message = "바코드 규격 유형은 필수입니다.")
    private BarcodeType barcodeType;

    private String gtin; // 13~14자리 상품식별코드 (01)

    private String expirationDateString; // YYMMDD (17)

    private String serialNumber; // 일련번호 (21)

    private String customBarcodeValue; // 사용자 지정 바코드 문자열(있을 경우)
}
