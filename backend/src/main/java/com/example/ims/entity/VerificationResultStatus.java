package com.example.ims.entity;

public enum VerificationResultStatus {
    PENDING("검증 대기"),
    PASS("적합 (PASS)"),
    FAIL("부적합 (FAIL)"),
    NOT_APPLICABLE("해당 없음 (N/A)");

    private final String description;

    VerificationResultStatus(String description) {
        this.description = description;
    }

    public String getDescription() {
        return description;
    }
}
