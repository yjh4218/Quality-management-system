package com.example.ims.entity;

/**
 * 부적합 조치 과제 유형
 */
public enum NcrActionType {
    CORRECTION("초동 시정조치 (격리, 반품, 폐기 등 즉각 조치)"),
    PREVENTIVE("재발 방지 대책"),
    REWORK("재작업 수행"),
    RE_INSPECTION("전수 재검사 및 유효성 확인");

    private final String description;

    NcrActionType(String description) {
        this.description = description;
    }

    public String getDescription() {
        return description;
    }
}
