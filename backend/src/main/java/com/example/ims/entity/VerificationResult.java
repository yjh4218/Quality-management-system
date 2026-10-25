package com.example.ims.entity;

/**
 * 조치 결과 검증 판정
 */
public enum VerificationResult {
    PENDING("검증 대기"),
    PASS("검증 적합"),
    FAIL("검증 불합격");

    private final String description;

    VerificationResult(String description) {
        this.description = description;
    }

    public String getDescription() {
        return description;
    }
}
