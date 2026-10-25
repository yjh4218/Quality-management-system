package com.example.ims.entity;

public enum EquipmentStatus {
    OPERATIONAL("정상 가동중"),
    UNDER_MAINTENANCE("점검/수리중"),
    CALIBRATION_PENDING("교정 대기중"),
    OUT_OF_SERVICE("사용 중지 (OOS/불합격)"),
    DECOMMISSIONED("폐기/불용처리");

    private final String description;

    EquipmentStatus(String description) {
        this.description = description;
    }

    public String getDescription() {
        return description;
    }
}
