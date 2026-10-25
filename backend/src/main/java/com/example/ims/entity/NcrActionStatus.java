package com.example.ims.entity;

/**
 * 부적합 조치 과제 진행 상태
 */
public enum NcrActionStatus {
    PENDING("대기"),
    IN_PROGRESS("진행 중"),
    COMPLETED("완료"),
    CANCELLED("취소");

    private final String description;

    NcrActionStatus(String description) {
        this.description = description;
    }

    public String getDescription() {
        return description;
    }
}
