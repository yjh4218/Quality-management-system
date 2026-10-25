package com.example.ims.entity;

public enum AuditStatus {
    PLANNED("계획 수립"),
    IN_PROGRESS("심사 진행 중"),
    REPORT_PENDING("보고서 작성 중"),
    APPROVED("심사 보고 승인"),
    FOLLOW_UP("후속 조치 추적"),
    CLOSED("최종 종결"),
    CANCELLED("심사 취소");

    private final String description;

    AuditStatus(String description) {
        this.description = description;
    }

    public String getDescription() {
        return description;
    }
}
