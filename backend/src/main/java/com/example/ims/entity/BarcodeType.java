package com.example.ims.entity;

import lombok.Getter;

/**
 * 바코드 및 UDI 규격 유형
 * ISO 13485:2016 §7.5.8 / 21 CFR 820.120
 */
@Getter
public enum BarcodeType {
    GS1_128("GS1-128", "1D 바코드 (AI 식별자 포함 표준 물류/의료 라벨)"),
    DATA_MATRIX("GS1 DataMatrix", "2D 2차원 매트릭스 (의료기기 UDI 표준)"),
    QR_CODE("QR Code", "2D QR 코드 (고객 인증 및 성적서 모바일 열람)"),
    CODE_128("Code 128", "내부 공정 식별용 표준 1D 바코드");

    private final String description;
    private final String detail;

    BarcodeType(String description, String detail) {
        this.description = description;
        this.detail = detail;
    }
}
