package com.example.ims.entity;

import lombok.Getter;

/**
 * 바코드 발행 상태
 */
@Getter
public enum BarcodeStatus {
    ACTIVE("유효", "현재 사용 중인 유효 바코드 라벨", "#10b981"),
    PRINTED("인쇄완료", "라벨 프린터 출력 완료", "#3b82f6"),
    INACTIVE("폐기/무효", "만료 또는 오류로 인한 무효화", "#94a3b8");

    private final String description;
    private final String detail;
    private final String color;

    BarcodeStatus(String description, String detail, String color) {
        this.description = description;
        this.detail = detail;
        this.color = color;
    }
}
