package com.example.ims.entity;

public enum Part11ComplianceStatus {
    COMPLIANT("완전 적합 (Compliant)"),
    PARTIALLY_COMPLIANT("부분 적합 / 보완 진행 (Partially Compliant)"),
    NON_COMPLIANT("부적합 (Non-Compliant)"),
    NOT_APPLICABLE("해당 없음 (Not Applicable)");

    private final String description;

    Part11ComplianceStatus(String description) {
        this.description = description;
    }

    public String getDescription() {
        return description;
    }
}
