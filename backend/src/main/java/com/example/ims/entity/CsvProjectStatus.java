package com.example.ims.entity;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum CsvProjectStatus {
    PLANNING("계획 수립 (Planning)"),
    PROTOCOL_DEVELOPMENT("프로토콜 개발 (Protocol Development)"),
    IQ_EXECUTING("설치 적격성(IQ) 실행 (IQ Executing)"),
    OQ_EXECUTING("운전 적격성(OQ) 실행 (OQ Executing)"),
    PQ_EXECUTING("성능 적격성(PQ) 실행 (PQ Executing)"),
    VSR_REPORTING("종합보고서 작성 (VSR Reporting)"),
    GO_LIVE_APPROVED("운영 승인 완료 (Go-Live Approved)"),
    OPERATIONAL("정식 운영 중 (Operational / In Service)");

    private final String description;
}
