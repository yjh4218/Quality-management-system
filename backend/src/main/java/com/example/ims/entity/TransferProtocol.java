package com.example.ims.entity;

import lombok.Getter;

/**
 * 전송 프로토콜 / 방식 (DEC-02)
 */
@Getter
public enum TransferProtocol {
    REST_API("REST API (실시간/Mock)", "JSON 기반 실시간 웹훅 또는 REST 인터페이스"),
    CSV_BATCH("CSV/엑셀 일괄 배치", "정기 파일 업로드 및 일괄 파싱"),
    MANUAL_RECONCILIATION("수기 대사 (품질 승인)", "품질 책임자가 외부 시스템 출력물과 대사 후 직접 승인");

    private final String description;
    private final String detail;

    TransferProtocol(String description, String detail) {
        this.description = description;
        this.detail = detail;
    }
}
