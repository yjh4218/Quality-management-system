package com.example.ims.entity;

import lombok.Getter;

/**
 * 외부 연계 시스템 유형 (DEC-02)
 */
@Getter
public enum IntegrationSystemType {
    ERP("ERP (전사적자원관리)", "SAP, 더존 등 품목/발주/출하/수불 시스템"),
    WMS("WMS (물류창고관리)", "원부자재 및 완제품 보관/입출고/재고 창고 시스템"),
    MES("MES (제조실행시스템)", "공정별 칭량, 조제, 충진, 포장 라인 실적 시스템"),
    BARCODE_SYSTEM("바코드/UDI 시스템", "GS1 라벨 발행기 및 핸드헬드 스캐너 시스템");

    private final String description;
    private final String detail;

    IntegrationSystemType(String description, String detail) {
        this.description = description;
        this.detail = detail;
    }
}
