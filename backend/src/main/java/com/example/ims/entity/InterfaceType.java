package com.example.ims.entity;

import lombok.Getter;

/**
 * 외부 연계 인터페이스 업무 유형 (DEC-02)
 */
@Getter
public enum InterfaceType {
    INBOUND_LOT_SYNC("입고 LOT 동기화", "원부자재 입고 및 검수 데이터 연동"),
    PRODUCTION_LOT_SYNC("생산 실적 연동", "제조 라인 조제 및 충진 배치 실적 연동"),
    OUTBOUND_SHIPMENT_SYNC("출하 실적 연동", "완제품 출하 및 유통 거래처 배송 실적 연동"),
    INVENTORY_RECONCILIATION("재고 수기 대사", "ERP/WMS 재고와 eQMS 승인 재고 간 대사 및 불일치 조정");

    private final String description;
    private final String detail;

    InterfaceType(String description, String detail) {
        this.description = description;
        this.detail = detail;
    }
}
