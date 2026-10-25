package com.example.ims.entity;

import lombok.Getter;

/**
 * 외부 연계 및 수기 대사 처리 상태
 */
@Getter
public enum IntegrationStatus {
    SUCCESS("성공", "연동 정상 완료 (수량 100% 일치)", "#10b981"),
    PENDING("대사 대기", "외부 데이터 수신 후 품질 대사 확인 대기", "#f59e0b"),
    FAILED("연동 실패", "통신 장애 또는 규격 불일치로 인한 오류", "#ef4444"),
    RECONCILED("대사 완료", "수기 대사 및 불일치 조정 완료", "#3b82f6");

    private final String description;
    private final String detail;
    private final String color;

    IntegrationStatus(String description, String detail, String color) {
        this.description = description;
        this.detail = detail;
        this.color = color;
    }
}
