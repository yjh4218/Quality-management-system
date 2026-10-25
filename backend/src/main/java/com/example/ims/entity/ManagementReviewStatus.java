package com.example.ims.entity;

public enum ManagementReviewStatus {
    SCHEDULED("일정 수립/소집 통보"),
    IN_SESSION("회의 진행 중"),
    MINUTES_DRAFTED("회의록 초안 작성"),
    APPROVED("최고경영자 승인 및 종결");

    private final String description;

    ManagementReviewStatus(String description) {
        this.description = description;
    }

    public String getDescription() {
        return description;
    }
}
