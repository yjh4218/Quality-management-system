package com.example.ims.entity;

public enum MaintenanceResult {
    COMPLETED("정상 완료"),
    PARTIAL("부품 대기 / 임시 가동"),
    FAILED("보전 실패 / 재작업 필요");

    private final String description;

    MaintenanceResult(String description) {
        this.description = description;
    }

    public String getDescription() {
        return description;
    }
}
