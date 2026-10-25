package com.example.ims.entity;

public enum CalibrationResult {
    PASS("적합 (Pass)"),
    PASS_WITH_CORRECTION("조건부 적합 (보정표 사용)"),
    FAIL("불합격 (Fail / OOS)");

    private final String description;

    CalibrationResult(String description) {
        this.description = description;
    }

    public String getDescription() {
        return description;
    }
}
