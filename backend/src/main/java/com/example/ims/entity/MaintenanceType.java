package com.example.ims.entity;

public enum MaintenanceType {
    PREVENTIVE_PM("정기 예방보전 (PM)"),
    CORRECTIVE_BREAKDOWN("고장 수리 (BM)"),
    VALIDATION_IQ_OQ("적격성평가/밸리데이션 (IQ/OQ/PQ)");

    private final String description;

    MaintenanceType(String description) {
        this.description = description;
    }

    public String getDescription() {
        return description;
    }
}
