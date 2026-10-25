package com.example.ims.entity;

public enum DesignProjectStatus {
    ACTIVE("진행중"),
    UNDER_REVIEW("단계 심의중"),
    APPROVED("단계 승인"),
    ON_HOLD("일시 보류"),
    COMPLETED("개발 완료"),
    CANCELLED("프로젝트 취소");

    private final String description;

    DesignProjectStatus(String description) {
        this.description = description;
    }

    public String getDescription() {
        return description;
    }
}
