package com.example.ims.entity;

public enum ManagementReviewType {
    REGULAR_ANNUAL("정기 연차 경영검토"),
    SEMI_ANNUAL("반기 경영검토"),
    SPECIAL_REVIEW("특별 경영검토 (중대 이슈/규제 변경)");

    private final String description;

    ManagementReviewType(String description) {
        this.description = description;
    }

    public String getDescription() {
        return description;
    }
}
