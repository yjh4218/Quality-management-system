package com.example.ims.entity;

public enum CalibrationAgencyType {
    INTERNAL("사내 교정"),
    EXTERNAL_KOLAS("국가공인 교정기관 (KOLAS)"),
    MANUFACTURER("장비 제조사 (OEM)");

    private final String description;

    CalibrationAgencyType(String description) {
        this.description = description;
    }

    public String getDescription() {
        return description;
    }
}
