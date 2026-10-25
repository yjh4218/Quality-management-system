package com.example.ims.entity;

/**
 * 부적합품 격리 및 통제 상태 (ISO 13485:2016 §8.3 / ISO 22716:2007 §8.4)
 */
public enum QuarantineStatus {
    QUARANTINED("물리적 격리 보관 중 (격리창고 입고)"),
    TAGGED_HOLD("부적합 식별표 부착 및 사용 보류(HOLD)"),
    NOT_QUARANTINED("미격리 (조치 대상 아님/현장 보관)"),
    RELEASED_FROM_QUARANTINE("격리 해제 (처리 승인 또는 종결)");

    private final String description;

    QuarantineStatus(String description) {
        this.description = description;
    }

    public String getDescription() {
        return description;
    }
}
