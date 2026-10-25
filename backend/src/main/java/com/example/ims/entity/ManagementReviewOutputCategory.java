package com.example.ims.entity;

public enum ManagementReviewOutputCategory {
    QMS_IMPROVEMENT("QMS 및 프로세스 효과성 개선 조치"),
    PRODUCT_IMPROVEMENT("고객/규제 요구사항 관련 제품 개선"),
    RESOURCE_ALLOCATION("필요 자원(인력/설비/예산) 배분 및 지원 결정");

    private final String description;

    ManagementReviewOutputCategory(String description) {
        this.description = description;
    }

    public String getDescription() {
        return description;
    }
}
